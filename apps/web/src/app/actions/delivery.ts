"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEvolutionMutationAccess } from "@/lib/evolution-access";
import {
  assertEvolutionProjectRoot,
  resolveEvolutionStateRoot,
} from "@/lib/evolution-workspace";
import { runDeliveryCoreCli } from "@/lib/delivery-workspace";
import { evolutionActionRateLimit } from "@/lib/rate-limit";

const OperationSchema = z.enum([
  "inspect-operation",
  "clear-stale-operation",
  "inspect-recovery",
  "apply-recovery",
  "request-cancellation",
]);
const CycleIdSchema = z
  .string()
  .trim()
  .min(3, "Cycle ID must contain at least 3 characters")
  .max(128, "Cycle ID must contain at most 128 characters")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
    "Cycle ID may contain only letters, numbers, dot, underscore, colon and dash"
  );

export type DeliveryActionState = {
  error: string | null;
  ok?: boolean;
  message?: string;
  cycleId?: string;
  operation?: z.infer<typeof OperationSchema>;
};

type OperationResult = {
  decision?: string;
  applied?: boolean;
  inspection?: {
    disposition?: string;
    findings?: string[];
    record?: { operationId?: string; status?: string };
  };
};

type CancellationResult = {
  decision?: string;
  applied?: boolean;
  signalSent?: boolean;
  nextAction?: string;
};

type RecoveryResult = {
  recovery?: {
    decision?: string;
    applied?: boolean;
    targetStage?: string | null;
    nextAction?: string;
  };
};

function validationError(result: {
  error: { issues: Array<{ message: string }> };
}): DeliveryActionState {
  return { error: result.error.issues[0]?.message ?? "Invalid delivery action" };
}

function applyConfirmed(formData: FormData): boolean {
  return formData.get("confirmApply") === "confirmed";
}

export async function runDeliveryWorkspaceAction(
  _previous: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const operation = OperationSchema.safeParse(formData.get("operation"));
  if (!operation.success) return validationError(operation);
  const cycleId = CycleIdSchema.safeParse(formData.get("cycleId"));
  if (!cycleId.success) return validationError(cycleId);

  const access = await getEvolutionMutationAccess();
  if (!access.allowed || !access.actor) return { error: access.reason };

  const isApply =
    operation.data === "clear-stale-operation" ||
    operation.data === "apply-recovery" ||
    operation.data === "request-cancellation";
  if (isApply && !applyConfirmed(formData)) {
    return { error: "Confirm the explicit apply action after reviewing the current inspection." };
  }

  const limit = await evolutionActionRateLimit.check(
    `${access.actor}:delivery:${operation.data}`
  );
  if (!limit.success) {
    return { error: "Too many delivery actions. Wait for the current rate-limit window to reset." };
  }

  try {
    const root = resolveEvolutionStateRoot();
    const projectRoot = await assertEvolutionProjectRoot();
    const actor = `${access.actor}:delivery-operator`;
    let message: string;

    if (operation.data === "request-cancellation") {
      const inspected = await runDeliveryCoreCli<OperationResult>([
        "operation",
        cycleId.data,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        actor,
      ]);
      const exactOperationId = inspected.inspection?.record?.operationId?.trim();
      if (!exactOperationId || inspected.inspection?.disposition !== "active") {
        return { error: "No exact active delivery operation is available for cancellation." };
      }
      const result = await runDeliveryCoreCli<CancellationResult>([
        "cancel",
        cycleId.data,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        `${actor}:cancellation`,
        "--operation-id",
        exactOperationId,
        "--apply",
      ]);
      message = result.applied
        ? result.signalSent
          ? "Graceful cancellation requested. SIGTERM was sent to the exact active child process group."
          : "Cancellation intent was persisted; the child had already stopped before SIGTERM."
        : `Cancellation was not applied: ${result.decision ?? "blocked"}.`;
    } else if (
      operation.data === "inspect-operation" ||
      operation.data === "clear-stale-operation"
    ) {
      const result = await runDeliveryCoreCli<OperationResult>([
        "operation",
        cycleId.data,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        actor,
        ...(operation.data === "clear-stale-operation" ? ["--apply"] : []),
      ]);
      const disposition = result.inspection?.disposition ?? result.decision ?? "unknown";
      message = result.applied
        ? "The proven stale operation lease was cleared and recovery evidence was persisted."
        : `Operation inspection completed: ${disposition}. No state was changed.`;
    } else {
      const result = await runDeliveryCoreCli<RecoveryResult>([
        "recover",
        cycleId.data,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        actor,
        ...(operation.data === "apply-recovery" ? ["--apply"] : []),
      ]);
      const recovery = result.recovery;
      const decision = recovery?.decision ?? recovery?.targetStage ?? "no-transition";
      message = recovery?.applied
        ? `Delivery reconciliation applied: ${decision}.`
        : `Delivery reconciliation inspected: ${decision}. No lifecycle state was changed.`;
    }

    revalidatePath("/app/evolution");
    revalidatePath("/app/evolution/delivery");
    return {
      error: null,
      ok: true,
      cycleId: cycleId.data,
      operation: operation.data,
      message,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Delivery action failed" };
  }
}
