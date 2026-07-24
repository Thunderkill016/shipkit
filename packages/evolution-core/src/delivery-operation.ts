import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5_000;

export class DeliveryOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryOperationError";
  }
}

export type DeliveryOperationKind = "execute" | "verify" | "publish";
export type DeliveryOperationStatus = "running" | "completed" | "failed" | "abandoned";
export type DeliveryProcessState = "not-recorded" | "alive" | "dead" | "foreign-host";
export type DeliveryOperationDisposition = "healthy" | "active" | "stale" | "blocked";

export type DeliveryOperationRecord = {
  schemaVersion: 1;
  recordType: "delivery-operation";
  integrityDigest: string;
  operationId: string;
  cycleId: string;
  operation: DeliveryOperationKind;
  actor: string;
  projectRoot: string;
  ownerHost: string;
  ownerPid: number;
  childPid: number | null;
  startedAt: string;
  heartbeatAt: string;
  completedAt: string | null;
  status: DeliveryOperationStatus;
  errorDigest: string | null;
  recoveryEvidenceRef: string | null;
};

export type DeliveryOperationInspection = {
  controlStatus: "missing" | "valid" | "invalid";
  record: DeliveryOperationRecord | null;
  lockPresent: boolean;
  ownerState: DeliveryProcessState;
  childState: DeliveryProcessState;
  disposition: DeliveryOperationDisposition;
  findings: string[];
};

export type WithDeliveryOperationInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  operation: DeliveryOperationKind;
  now?: string;
  heartbeatIntervalMs?: number;
};

export type ReconcileDeliveryOperationInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  apply: boolean;
  now?: string;
};

type OperationContext = {
  checkpointPath: string;
  operationId: string;
};

const operationContext = new AsyncLocalStorage<OperationContext>();

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function operationDirectory(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId));
}

function checkpointPath(store: EvolutionStore, cycleId: string): string {
  return join(operationDirectory(store, cycleId), "operation.json");
}

function lockPath(store: EvolutionStore, cycleId: string): string {
  return join(operationDirectory(store, cycleId), "operation.lock");
}

function candidatePath(store: EvolutionStore, cycleId: string, operationId: string): string {
  const portableId = operationId.replace(/[^A-Za-z0-9._-]/g, "-");
  return join(operationDirectory(store, cycleId), `${portableId}.candidate.json`);
}

function atomicWriteJsonSync(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  try {
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
  try {
    const directory = openSync(dirname(path), "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
  } catch {
    // Directory fsync is not available on every supported platform.
  }
}

function withDigest(record: Omit<DeliveryOperationRecord, "integrityDigest">): DeliveryOperationRecord {
  return { ...record, integrityDigest: digestJson(record) };
}

function readRecord(path: string): DeliveryOperationRecord {
  const value = JSON.parse(readFileSync(path, "utf8")) as DeliveryOperationRecord;
  const validOperation = value.operation === "execute" || value.operation === "verify" || value.operation === "publish";
  const validStatus =
    value.status === "running" ||
    value.status === "completed" ||
    value.status === "failed" ||
    value.status === "abandoned";
  const validOwnerPid = Number.isInteger(value.ownerPid) && value.ownerPid > 0;
  const validChildPid =
    value.childPid === null || (Number.isInteger(value.childPid) && value.childPid > 0);
  if (
    value.schemaVersion !== 1 ||
    value.recordType !== "delivery-operation" ||
    !value.operationId ||
    !value.cycleId ||
    !value.actor ||
    !value.ownerHost ||
    !validOperation ||
    !validStatus ||
    !validOwnerPid ||
    !validChildPid
  ) {
    throw new DeliveryOperationError("delivery operation checkpoint has an unsupported shape");
  }
  const { integrityDigest, ...payload } = value;
  if (!/^[a-f0-9]{64}$/i.test(integrityDigest) || integrityDigest !== digestJson(payload)) {
    throw new DeliveryOperationError("delivery operation checkpoint integrity mismatch");
  }
  return value;
}

function writeRecord(path: string, value: DeliveryOperationRecord): DeliveryOperationRecord {
  const { integrityDigest: _discarded, ...payload } = value;
  const next = withDigest(payload);
  atomicWriteJsonSync(path, next);
  return next;
}

function processState(ownerHost: string, pid: number | null): DeliveryProcessState {
  if (pid === null) return "not-recorded";
  if (ownerHost !== hostname()) return "foreign-host";
  if (!Number.isInteger(pid) || pid <= 0) return "dead";
  try {
    process.kill(pid, 0);
    return "alive";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM" ? "alive" : "dead";
  }
}

function childProcessState(ownerHost: string, pid: number | null): DeliveryProcessState {
  if (pid === null || ownerHost !== hostname() || process.platform === "win32") {
    return processState(ownerHost, pid);
  }
  try {
    process.kill(-pid, 0);
    return "alive";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") return "alive";
    return processState(ownerHost, pid);
  }
}

export function inspectDeliveryOperation(
  store: EvolutionStore,
  cycleId: string
): DeliveryOperationInspection {
  const path = checkpointPath(store, cycleId);
  const acquisitionPath = lockPath(store, cycleId);
  const lockPresent = existsSync(acquisitionPath);
  if (!existsSync(path) && !lockPresent) {
    return {
      controlStatus: "missing",
      record: null,
      lockPresent: false,
      ownerState: "not-recorded",
      childState: "not-recorded",
      disposition: "healthy",
      findings: [],
    };
  }

  let record: DeliveryOperationRecord;
  const checkpointFindings: string[] = [];
  try {
    if (existsSync(path)) {
      record = readRecord(path);
    } else {
      record = readRecord(acquisitionPath);
      checkpointFindings.push(
        "primary checkpoint is missing; using the integrity-valid acquisition lock record"
      );
    }
  } catch (error) {
    return {
      controlStatus: "invalid",
      record: null,
      lockPresent,
      ownerState: "not-recorded",
      childState: "not-recorded",
      disposition: "blocked",
      findings: [error instanceof Error ? error.message : String(error)],
    };
  }

  const ownerState = processState(record.ownerHost, record.ownerPid);
  const childState = childProcessState(record.ownerHost, record.childPid);
  const findings: string[] = [...checkpointFindings];
  let disposition: DeliveryOperationDisposition = "healthy";

  if (record.status === "running") {
    if (ownerState === "foreign-host" || childState === "foreign-host") {
      disposition = "blocked";
      findings.push("running operation belongs to another host and cannot be proven stale locally");
    } else if (ownerState === "alive" || childState === "alive") {
      disposition = "active";
      findings.push(
        childState === "alive"
          ? "delivery child process or process group is still alive"
          : "delivery owner process is still alive"
      );
    } else {
      disposition = "stale";
      findings.push("delivery owner and recorded child process group are no longer alive");
    }
  } else if (lockPresent) {
    disposition = "stale";
    findings.push("terminal operation left a stale lock file");
  }

  return {
    controlStatus: "valid",
    record,
    lockPresent,
    ownerState,
    childState,
    disposition,
    findings,
  };
}

function acquireOperationLock(
  store: EvolutionStore,
  cycleId: string,
  preparedCheckpointPath: string
): void {
  mkdirSync(operationDirectory(store, cycleId), { recursive: true, mode: 0o700 });
  try {
    linkSync(preparedCheckpointPath, lockPath(store, cycleId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const inspection = inspectDeliveryOperation(store, cycleId);
    throw new DeliveryOperationError(
      `delivery operation lease is ${inspection.disposition}: ${inspection.findings.join("; ") || "another operation owns the lock"}`
    );
  }
}

function releaseOperationLock(store: EvolutionStore, cycleId: string): void {
  rmSync(lockPath(store, cycleId), { force: true });
}

function updateHeartbeat(path: string, operationId: string): void {
  const current = readRecord(path);
  if (current.operationId !== operationId || current.status !== "running") return;
  writeRecord(path, { ...current, heartbeatAt: new Date().toISOString() });
}

export function recordDeliveryChildProcess(pid: number | null): void {
  const context = operationContext.getStore();
  if (!context || pid === null) return;
  const current = readRecord(context.checkpointPath);
  if (current.operationId !== context.operationId || current.status !== "running") {
    throw new DeliveryOperationError("delivery child process does not match the active operation lease");
  }
  writeRecord(context.checkpointPath, {
    ...current,
    childPid: pid,
    heartbeatAt: new Date().toISOString(),
  });
}

export async function withDeliveryOperation<T>(
  input: WithDeliveryOperationInput,
  callback: () => Promise<T>
): Promise<{ value: T; operation: DeliveryOperationRecord }> {
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryOperationError("delivery operation actor is required");
  const heartbeatIntervalMs = input.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  if (!Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs <= 0) {
    throw new DeliveryOperationError("delivery heartbeat interval must be a positive integer");
  }
  const existing = inspectDeliveryOperation(input.store, input.cycleId);
  if (existing.disposition !== "healthy") {
    throw new DeliveryOperationError(
      `cannot start ${input.operation}; delivery operation state is ${existing.disposition}: ${existing.findings.join("; ")}`
    );
  }

  const path = checkpointPath(input.store, input.cycleId);
  const startedAt = input.now ?? new Date().toISOString();
  let record = withDigest({
    schemaVersion: 1,
    recordType: "delivery-operation",
    operationId: `operation:${sha256(`${input.cycleId}|${input.operation}|${actor}|${randomUUID()}`).slice(0, 24)}`,
    cycleId: input.cycleId,
    operation: input.operation,
    actor,
    projectRoot: resolve(input.projectRoot),
    ownerHost: hostname(),
    ownerPid: process.pid,
    childPid: null,
    startedAt,
    heartbeatAt: startedAt,
    completedAt: null,
    status: "running",
    errorDigest: null,
    recoveryEvidenceRef: null,
  });
  const preparedCheckpointPath = candidatePath(
    input.store,
    input.cycleId,
    record.operationId
  );
  atomicWriteJsonSync(preparedCheckpointPath, record);
  let acquired = false;
  try {
    acquireOperationLock(input.store, input.cycleId, preparedCheckpointPath);
    acquired = true;
    renameSync(preparedCheckpointPath, path);
  } catch (error) {
    rmSync(preparedCheckpointPath, { force: true });
    if (acquired) releaseOperationLock(input.store, input.cycleId);
    throw error;
  }

  let heartbeatFailure: Error | null = null;
  const heartbeat = setInterval(() => {
    try {
      updateHeartbeat(path, record.operationId);
    } catch (error) {
      heartbeatFailure = error instanceof Error ? error : new Error(String(error));
    }
  }, heartbeatIntervalMs);
  heartbeat.unref();

  return await operationContext.run(
    { checkpointPath: path, operationId: record.operationId },
    async () => {
      try {
        const value = await callback();
        if (heartbeatFailure) throw heartbeatFailure;
        const current = readRecord(path);
        record = writeRecord(path, {
          ...current,
          childPid: null,
          heartbeatAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: "completed",
          errorDigest: null,
        });
        releaseOperationLock(input.store, input.cycleId);
        return { value, operation: record };
      } catch (error) {
        try {
          const current = readRecord(path);
          record = writeRecord(path, {
            ...current,
            childPid: null,
            heartbeatAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            status: "failed",
            errorDigest: sha256(error instanceof Error ? error.message : String(error)),
          });
          releaseOperationLock(input.store, input.cycleId);
        } catch {
          // Preserve the lock when terminal persistence fails so later work fails closed.
        }
        throw error;
      } finally {
        clearInterval(heartbeat);
      }
    }
  );
}

export async function reconcileDeliveryOperation(input: ReconcileDeliveryOperationInput) {
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryOperationError("delivery operation recovery actor is required");
  const inspectedAt = input.now ?? new Date().toISOString();
  const inspection = inspectDeliveryOperation(input.store, input.cycleId);
  const canClear = inspection.disposition === "stale" && inspection.controlStatus === "valid";
  const decision = canClear ? "clear-stale" : inspection.disposition === "healthy" ? "healthy" : "blocked";
  let applied = false;
  let recoveryEvidenceRef: string | null = null;
  let record = inspection.record;

  if (input.apply && canClear && record) {
    const recovery = {
      schemaVersion: 1 as const,
      recordType: "delivery-operation-recovery" as const,
      recoveryId: `operation-recovery:${sha256(`${input.cycleId}|${actor}|${inspectedAt}|${randomUUID()}`).slice(0, 24)}`,
      cycleId: input.cycleId,
      actor,
      inspectedAt,
      operationId: record.operationId,
      previousStatus: record.status,
      ownerState: inspection.ownerState,
      childState: inspection.childState,
      findings: inspection.findings,
      action: "clear-stale-lock" as const,
    };
    const evidence = await new EvidenceRegistry(
      input.store.rootDir,
      resolve(input.projectRoot)
    ).registerJson("delivery-operation-recovery", recovery);
    recoveryEvidenceRef = `evidence:${evidence.occurrenceId}`;
    const refreshed = inspectDeliveryOperation(input.store, input.cycleId);
    if (
      refreshed.disposition !== "stale" ||
      refreshed.controlStatus !== "valid" ||
      refreshed.record?.operationId !== record.operationId
    ) {
      return {
        cycleId: input.cycleId,
        inspectedAt,
        decision: "blocked" as const,
        applyRequested: true,
        applied: false,
        inspection: refreshed,
        record: refreshed.record,
        recoveryEvidenceRef,
        nextAction: "Operation ownership changed during recovery; inspect again before any mutation.",
        limitations: [
          "process liveness can only be proven for the current host",
          "hard crashes can lose command output that was never durably recorded",
          "direct library calls bypass this CLI operation lease boundary",
          "publication subprocess PIDs are not yet captured; publish is protected by the owner-process lease",
          "operation recovery never kills processes, reruns commands, merges, deploys, or writes production",
        ],
      };
    }
    record = writeRecord(checkpointPath(input.store, input.cycleId), {
      ...record,
      childPid: null,
      heartbeatAt: inspectedAt,
      completedAt: record.completedAt ?? inspectedAt,
      status: record.status === "running" ? "abandoned" : record.status,
      recoveryEvidenceRef,
    });
    rmSync(candidatePath(input.store, input.cycleId, record.operationId), { force: true });
    releaseOperationLock(input.store, input.cycleId);
    applied = true;
  }

  return {
    cycleId: input.cycleId,
    inspectedAt,
    decision,
    applyRequested: input.apply,
    applied,
    inspection,
    record,
    recoveryEvidenceRef,
    nextAction:
      decision === "clear-stale" && !input.apply
        ? "Review the dead owner/child evidence, then rerun with --apply before invoking delivery recovery."
        : decision === "clear-stale"
          ? "Run cyclewarden-deliver recover to reconcile durable delivery state before starting new work."
          : decision === "blocked"
            ? "Do not clear the lease while an owner/child may still be active or the checkpoint cannot be trusted."
            : "No stale delivery operation lease requires action.",
    limitations: [
      "process liveness can only be proven for the current host",
      "hard crashes can lose command output that was never durably recorded",
      "direct library calls bypass this CLI operation lease boundary",
      "publication subprocess PIDs are not yet captured; publish is protected by the owner-process lease",
      "operation recovery never kills processes, reruns commands, merges, deploys, or writes production",
    ],
  };
}

export function showDeliveryOperation(store: EvolutionStore, cycleId: string) {
  return { deliveryOperation: inspectDeliveryOperation(store, cycleId) };
}
