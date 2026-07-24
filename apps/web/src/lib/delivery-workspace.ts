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
  record: {
    operationId: string;
    operation: string;
    actor: string;
    status: string;
    startedAt: string;
    heartbeatAt: string;
    completedAt: string | null;
  } | null;
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

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function operationView(value: unknown): DeliveryOperationView {
  const outer = record(value);
  const inspection = record(outer?.inspection ?? outer?.deliveryOperation ?? value);
  const operationRecord = record(inspection?.record);
  return {
    controlStatus: text(inspection?.controlStatus, "missing"),
    disposition: text(inspection?.disposition, "healthy"),
    lockPresent: inspection?.lockPresent === true,
    ownerState: text(inspection?.ownerState, "not-recorded"),
    childState: text(inspection?.childState, "not-recorded"),
    findings: strings(inspection?.findings),
    record: operationRecord
      ? {
          operationId: text(operationRecord.operationId),
          operation: text(operationRecord.operation),
          actor: text(operationRecord.actor),
          status: text(operationRecord.status),
          startedAt: text(operationRecord.startedAt),
          heartbeatAt: text(operationRecord.heartbeatAt),
          completedAt: nullableText(operationRecord.completedAt),
        }
      : null,
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
    operation: operationView(operationOutput),
  };
}

export async function loadDeliveryWorkspace(cycleId: string) {
  const root = resolveEvolutionStateRoot();
  try {
    const projectRoot = await assertEvolutionProjectRoot();
    const operation = await runDeliveryCoreCli<unknown>([
      "operation",
      cycleId,
      "--root",
      root,
      "--project-root",
      projectRoot,
      "--actor",
      "cyclewarden-web:delivery-observer",
    ]);

    let show: unknown = {};
    try {
      show = await runDeliveryCoreCli<unknown>(["show", cycleId, "--root", root]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cannot read delivery control|no such file|enoent/i.test(message)) throw error;
    }

    return { state: normalizeDeliveryWorkspace(cycleId, show, operation), error: null };
  } catch (error) {
    return {
      state: null as DeliveryWorkspaceView | null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
