import "server-only";

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  assertEvolutionProjectRoot,
  resolveCycleWardenRepositoryRoot,
  resolveEvolutionStateRoot,
} from "./evolution-workspace";

const execFileAsync = promisify(execFile);
const MAX_CLI_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_CLI_RUNTIME_MS = 10 * 60 * 1000;

type JsonRecord = Record<string, unknown>;

export type DeliveryOperationView = {
  controlStatus: string;
  disposition: string;
  lockPresent: boolean;
  ownerState: string;
  childState: string;
  findings: string[];
  cancellable: boolean;
  cancellation: {
    operationId: string;
    actor: string;
    requestedAt: string;
    signalSentAt: string | null;
  } | null;
  record: {
    operationId: string;
    operation: string;
    actor: string;
    status: string;
    phase: string;
    startedAt: string;
    heartbeatAt: string;
    completedAt: string | null;
    cancelRequestedAt: string | null;
    cancelRequestedBy: string | null;
    cancelSignalAt: string | null;
  } | null;
};

export type DeliveryProgressView = {
  controlStatus: string;
  truncated: boolean;
  findings: string[];
  latestOperationId: string | null;
  activeStep: {
    stepIndex: number;
    stepId: string;
    childPid: number | null;
  } | null;
  events: Array<{
    eventId: string;
    sequence: number;
    operationId: string;
    operation: string;
    occurredAt: string;
    phase: string;
    status: string;
    stepIndex: number | null;
    stepId: string | null;
    childPid: number | null;
    executable: string | null;
    exitCode: number | null;
    signal: string | null;
  }>;
};

export type DeliveryWorkspaceView = {
  cycleId: string;
  branchName: string | null;
  worktreeId: string | null;
  execution: {
    status: string;
    actor: string;
    commandStatus: string;
    completedAt: string;
    changedFiles: string[];
    scopeViolations: string[];
  } | null;
  verification: {
    verdict: string;
    verifierActor: string;
    completedAt: string;
    commitSha: string | null;
    checks: Array<{ id: string; status: string }>;
    unresolvedRisks: string[];
  } | null;
  publication: {
    status: string;
    completedAt: string;
    draftPrUrl: string | null;
    unresolvedRisks: string[];
    steps: Record<string, string>;
  } | null;
  recovery: JsonRecord | null;
  operation: DeliveryOperationView;
  progress: DeliveryProgressView;
};

function deliveryCliPath(): string {
  return resolve(
    resolveCycleWardenRepositoryRoot(),
    process.env.CYCLEWARDEN_DELIVERY_CLI ?? "packages/evolution-core/dist/bin-delivery.js"
  );
}

function cliErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const stderr = "stderr" in error ? String(error.stderr ?? "").trim() : "";
    if (stderr) return stderr.replace(/^cyclewarden-deliver:\s*/i, "").slice(0, 800);
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 800);
}

export async function runDeliveryCoreCli<T>(args: string[]): Promise<T> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [deliveryCliPath(), ...args], {
      cwd: resolveCycleWardenRepositoryRoot(),
      env: process.env,
      maxBuffer: MAX_CLI_OUTPUT_BYTES,
      timeout: MAX_CLI_RUNTIME_MS,
      windowsHide: true,
    });
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(cliErrorMessage(error));
  }
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function text(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function integer(value: unknown, fallback = 0): number {
  return Number.isInteger(value) ? Number(value) : fallback;
}

function nullableInteger(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function operationView(value: unknown, cancellationValue: unknown): DeliveryOperationView {
  const outer = record(value);
  const inspection = record(outer?.inspection ?? outer?.deliveryOperation ?? value);
  const operationRecord = record(inspection?.record);
  const cancellationOuter = record(cancellationValue);
  const cancellationInspection = record(
    cancellationOuter?.deliveryCancellation ?? cancellationValue
  );
  const cancellationRecord = record(cancellationInspection?.request);
  const status = text(operationRecord?.status);
  const matchingCancellation =
    cancellationRecord &&
    text(cancellationRecord.operationId) === text(operationRecord?.operationId)
      ? cancellationRecord
      : null;
  const inferredPhase =
    status !== "running"
      ? status
      : matchingCancellation
        ? "cancel-requested"
        : text(inspection?.childState, "not-recorded") === "alive"
          ? "command-running"
          : "preparing";
  const phase = text(operationRecord?.phase, inferredPhase);
  return {
    controlStatus: text(inspection?.controlStatus, "missing"),
    disposition: text(inspection?.disposition, "healthy"),
    lockPresent: inspection?.lockPresent === true,
    ownerState: text(inspection?.ownerState, "not-recorded"),
    childState: text(inspection?.childState, "not-recorded"),
    findings: strings(inspection?.findings),
    cancellable: cancellationInspection?.cancellable === true && !matchingCancellation,
    cancellation: matchingCancellation
      ? {
          operationId: text(matchingCancellation.operationId),
          actor: text(matchingCancellation.actor),
          requestedAt: text(matchingCancellation.requestedAt),
          signalSentAt: nullableText(matchingCancellation.signalSentAt),
        }
      : null,
    record: operationRecord
      ? {
          operationId: text(operationRecord.operationId),
          operation: text(operationRecord.operation),
          actor: text(operationRecord.actor),
          status: phase === status ? status : `${status} · ${phase}`,
          phase,
          startedAt: text(operationRecord.startedAt),
          heartbeatAt: text(operationRecord.heartbeatAt),
          completedAt: nullableText(operationRecord.completedAt),
          cancelRequestedAt:
            nullableText(operationRecord.cancelRequestedAt) ??
            nullableText(matchingCancellation?.requestedAt),
          cancelRequestedBy:
            nullableText(operationRecord.cancelRequestedBy) ?? nullableText(matchingCancellation?.actor),
          cancelSignalAt:
            nullableText(operationRecord.cancelSignalAt) ??
            nullableText(matchingCancellation?.signalSentAt),
        }
      : null,
  };
}

function progressView(value: unknown): DeliveryProgressView {
  const outer = record(value);
  const inspection = record(outer?.deliveryProgress ?? value) ?? {};
  const events = Array.isArray(inspection.events) ? inspection.events : [];
  const latest = record(inspection.latest);
  const activeStep = record(inspection.activeStep);
  return {
    controlStatus: text(inspection.controlStatus, "missing"),
    truncated: inspection.truncated === true,
    findings: strings(inspection.findings),
    latestOperationId: nullableText(latest?.operationId),
    activeStep:
      activeStep && Number.isInteger(activeStep.stepIndex)
        ? {
            stepIndex: integer(activeStep.stepIndex),
            stepId: text(activeStep.stepId),
            childPid: nullableInteger(activeStep.childPid),
          }
        : null,
    events: events.flatMap((item) => {
      const event = record(item);
      if (!event || !Number.isInteger(event.sequence)) return [];
      return [
        {
          eventId: text(event.eventId),
          sequence: integer(event.sequence),
          operationId: text(event.operationId),
          operation: text(event.operation),
          occurredAt: text(event.occurredAt),
          phase: text(event.phase),
          status: text(event.status),
          stepIndex: nullableInteger(event.stepIndex),
          stepId: nullableText(event.stepId),
          childPid: nullableInteger(event.childPid),
          executable: nullableText(event.executable),
          exitCode: nullableInteger(event.exitCode),
          signal: nullableText(event.signal),
        },
      ];
    }),
  };
}

export function normalizeDeliveryWorkspace(
  cycleId: string,
  showOutput: unknown,
  operationOutput: unknown
): DeliveryWorkspaceView {
  const show = record(showOutput) ?? {};
  const execution = record(show.execution);
  const verification = record(show.verification);
  const publication = record(show.publication);
  const checks = Array.isArray(verification?.checks) ? verification.checks : [];
  const steps = record(publication?.steps) ?? {};

  return {
    cycleId,
    branchName: nullableText(show.branchName),
    worktreeId: nullableText(show.worktreeId),
    execution: execution
      ? {
          status: text(execution.status),
          actor: text(execution.actor),
          commandStatus: text(execution.commandStatus),
          completedAt: text(execution.completedAt),
          changedFiles: strings(execution.changedFiles),
          scopeViolations: strings(execution.scopeViolations),
        }
      : null,
    verification: verification
      ? {
          verdict: text(verification.verdict),
          verifierActor: text(verification.verifierActor),
          completedAt: text(verification.completedAt),
          commitSha: nullableText(verification.commitSha),
          checks: checks.flatMap((item) => {
            const check = record(item);
            return check ? [{ id: text(check.id), status: text(check.status) }] : [];
          }),
          unresolvedRisks: strings(verification.unresolvedRisks),
        }
      : null,
    publication: publication
      ? {
          status: text(publication.status),
          completedAt: text(publication.completedAt),
          draftPrUrl: nullableText(publication.draftPrUrl),
          unresolvedRisks: strings(publication.unresolvedRisks),
          steps: Object.fromEntries(
            Object.entries(steps).flatMap(([key, value]) =>
              typeof value === "string" ? [[key, value]] : []
            )
          ),
        }
      : null,
    recovery: record(show.recovery),
    operation: operationView(operationOutput, show.deliveryCancellation),
    progress: progressView(show.deliveryProgress),
  };
}

export async function loadDeliveryWorkspace(cycleId: string) {
  const root = resolveEvolutionStateRoot();
  try {
    const projectRoot = await assertEvolutionProjectRoot();
    const [operation, progress] = await Promise.all([
      runDeliveryCoreCli<unknown>([
        "operation",
        cycleId,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        "cyclewarden-web:delivery-observer",
      ]),
      runDeliveryCoreCli<unknown>(["progress", cycleId, "--root", root]),
    ]);

    const operationOuter = record(operation);
    const operationInspection = record(
      operationOuter?.inspection ?? operationOuter?.deliveryOperation ?? operation
    );
    const exactOperationId = nullableText(record(operationInspection?.record)?.operationId);
    let cancellation: unknown = {
      deliveryCancellation: { cancellable: false, request: null },
    };
    if (exactOperationId) {
      const cancellationPlan = await runDeliveryCoreCli<unknown>([
        "cancel",
        cycleId,
        "--root",
        root,
        "--project-root",
        projectRoot,
        "--actor",
        "cyclewarden-web:delivery-observer",
        "--operation-id",
        exactOperationId,
      ]);
      cancellation = {
        deliveryCancellation: record(record(cancellationPlan)?.inspection) ?? {},
      };
    }

    let show: unknown = {};
    try {
      show = await runDeliveryCoreCli<unknown>(["show", cycleId, "--root", root]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cannot read delivery control|no such file|enoent/i.test(message)) throw error;
    }

    return {
      state: normalizeDeliveryWorkspace(
        cycleId,
        {
          ...(record(show) ?? {}),
          ...(record(progress) ?? {}),
          ...(record(cancellation) ?? {}),
        },
        operation
      ),
      error: null,
    };
  } catch (error) {
    return {
      state: null as DeliveryWorkspaceView | null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
