import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
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

const MAX_HEARTBEAT_AGE_MS = 20_000;

export class DeliveryCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryCancellationError";
  }
}

type OperationRecord = {
  schemaVersion: 1;
  recordType: "delivery-operation";
  integrityDigest: string;
  operationId: string;
  cycleId: string;
  operation: "execute" | "verify" | "publish";
  actor: string;
  projectRoot: string;
  ownerHost: string;
  ownerPid: number;
  childPid: number | null;
  startedAt: string;
  heartbeatAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed" | "abandoned";
  errorDigest: string | null;
  recoveryEvidenceRef: string | null;
  [key: string]: unknown;
};

export type DeliveryCancellationRecord = {
  schemaVersion: 1;
  recordType: "delivery-cancellation-request";
  integrityDigest: string;
  cancellationId: string;
  cycleId: string;
  operationId: string;
  actor: string;
  requestedAt: string;
  ownerHost: string;
  ownerPid: number;
  ownerStartToken: string;
  childPid: number;
  childStartToken: string;
  childParentPid: number;
  childProcessGroup: number;
  signal: "SIGTERM";
  signalSentAt: string | null;
  evidenceRef: string | null;
};

export type DeliveryCancellationInspection = {
  operationStatus: "missing" | "valid" | "invalid";
  cancellationStatus: "missing" | "valid" | "invalid";
  cancellable: boolean;
  findings: string[];
  operation: {
    operationId: string;
    operation: string;
    actor: string;
    projectRoot: string;
    ownerHost: string;
    ownerPid: number;
    childPid: number | null;
    heartbeatAt: string;
    status: string;
  } | null;
  processIdentity: {
    ownerStartToken: string;
    childStartToken: string;
    childParentPid: number;
    childProcessGroup: number;
  } | null;
  request: DeliveryCancellationRecord | null;
};

export type RequestDeliveryCancellationInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  expectedOperationId: string;
  apply: boolean;
  now?: string;
};

type LinuxIdentity = { startToken: string; parentPid: number; processGroup: number };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function directory(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId));
}

function pathFor(store: EvolutionStore, cycleId: string, name: string): string {
  return join(directory(store, cycleId), name);
}

function atomicWrite(path: string, value: unknown): void {
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
    const parent = openSync(dirname(path), "r");
    try {
      fsyncSync(parent);
    } finally {
      closeSync(parent);
    }
  } catch {
    // Directory fsync is not available on every supported platform.
  }
}

function validDigest(value: { integrityDigest: string; [key: string]: unknown }): boolean {
  const { integrityDigest, ...payload } = value;
  return /^[a-f0-9]{64}$/i.test(integrityDigest) && integrityDigest === digestJson(payload);
}

function readOperation(path: string): OperationRecord {
  const value = JSON.parse(readFileSync(path, "utf8")) as OperationRecord;
  const operation = ["execute", "verify", "publish"].includes(value.operation);
  const status = ["running", "completed", "failed", "abandoned"].includes(value.status);
  if (
    value.schemaVersion !== 1 ||
    value.recordType !== "delivery-operation" ||
    !value.operationId ||
    !value.cycleId ||
    !value.actor ||
    !value.projectRoot ||
    !value.ownerHost ||
    !operation ||
    !status ||
    !Number.isInteger(value.ownerPid) ||
    value.ownerPid <= 0 ||
    !(value.childPid === null || (Number.isInteger(value.childPid) && value.childPid > 0)) ||
    !validDigest(value)
  ) {
    throw new DeliveryCancellationError("delivery operation checkpoint is invalid");
  }
  return value;
}

function withRequestDigest(
  value: Omit<DeliveryCancellationRecord, "integrityDigest">
): DeliveryCancellationRecord {
  return { ...value, integrityDigest: digestJson(value) };
}

function readRequest(path: string): DeliveryCancellationRecord {
  const value = JSON.parse(readFileSync(path, "utf8")) as DeliveryCancellationRecord;
  if (
    value.schemaVersion !== 1 ||
    value.recordType !== "delivery-cancellation-request" ||
    !value.cancellationId ||
    !value.cycleId ||
    !value.operationId ||
    !value.actor ||
    !value.requestedAt ||
    !value.ownerHost ||
    !Number.isInteger(value.ownerPid) ||
    value.ownerPid <= 0 ||
    !value.ownerStartToken ||
    !Number.isInteger(value.childPid) ||
    value.childPid <= 1 ||
    !value.childStartToken ||
    !Number.isInteger(value.childParentPid) ||
    !Number.isInteger(value.childProcessGroup) ||
    value.signal !== "SIGTERM" ||
    !(value.signalSentAt === null || typeof value.signalSentAt === "string") ||
    !(value.evidenceRef === null || typeof value.evidenceRef === "string") ||
    !validDigest(value)
  ) {
    throw new DeliveryCancellationError("delivery cancellation request is invalid");
  }
  return value;
}

function writeRequest(path: string, value: DeliveryCancellationRecord): DeliveryCancellationRecord {
  const { integrityDigest: _discarded, ...payload } = value;
  const next = withRequestDigest(payload);
  atomicWrite(path, next);
  return next;
}

function linuxIdentity(pid: number): LinuxIdentity | null {
  if (process.platform !== "linux") return null;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const end = stat.lastIndexOf(")");
    if (end < 0) return null;
    const fields = stat.slice(end + 1).trim().split(/\s+/);
    const parentPid = Number(fields[1]);
    const processGroup = Number(fields[2]);
    const startTime = fields[19];
    if (
      !Number.isInteger(parentPid) ||
      parentPid < 0 ||
      !Number.isInteger(processGroup) ||
      processGroup <= 0 ||
      !startTime
    ) {
      return null;
    }
    return { startToken: `linux:${startTime}`, parentPid, processGroup };
  } catch {
    return null;
  }
}

function alive(pid: number, group = false): boolean {
  try {
    process.kill(group && process.platform !== "win32" ? -pid : pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function fresh(heartbeatAt: string, now: string): boolean {
  const heartbeat = Date.parse(heartbeatAt);
  const observed = Date.parse(now);
  return (
    Number.isFinite(heartbeat) &&
    Number.isFinite(observed) &&
    observed >= heartbeat &&
    observed - heartbeat <= MAX_HEARTBEAT_AGE_MS
  );
}

function operationView(operation: OperationRecord | null) {
  return operation
    ? {
        operationId: operation.operationId,
        operation: operation.operation,
        actor: operation.actor,
        projectRoot: operation.projectRoot,
        ownerHost: operation.ownerHost,
        ownerPid: operation.ownerPid,
        childPid: operation.childPid,
        heartbeatAt: operation.heartbeatAt,
        status: operation.status,
      }
    : null;
}

export function inspectDeliveryCancellation(
  store: EvolutionStore,
  cycleId: string,
  now = new Date().toISOString()
): DeliveryCancellationInspection {
  const findings: string[] = [];
  let operation: OperationRecord | null = null;
  let lock: OperationRecord | null = null;
  let request: DeliveryCancellationRecord | null = null;
  let operationStatus: DeliveryCancellationInspection["operationStatus"] = "missing";
  let cancellationStatus: DeliveryCancellationInspection["cancellationStatus"] = "missing";

  const operationPath = pathFor(store, cycleId, "operation.json");
  const lockPath = pathFor(store, cycleId, "operation.lock");
  const requestPath = pathFor(store, cycleId, "cancel.json");

  if (existsSync(operationPath)) {
    try {
      operation = readOperation(operationPath);
      operationStatus = "valid";
    } catch (error) {
      operationStatus = "invalid";
      findings.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (existsSync(lockPath)) {
    try {
      lock = readOperation(lockPath);
    } catch (error) {
      operationStatus = "invalid";
      findings.push(`delivery acquisition lock cannot be trusted: ${String(error)}`);
    }
  }
  if (existsSync(requestPath)) {
    try {
      request = readRequest(requestPath);
      cancellationStatus = "valid";
    } catch (error) {
      cancellationStatus = "invalid";
      findings.push(`delivery cancellation request cannot be trusted: ${String(error)}`);
    }
  }

  if (!operation || operationStatus !== "valid") {
    return {
      operationStatus,
      cancellationStatus,
      cancellable: false,
      findings,
      operation: operationView(operation),
      processIdentity: null,
      request,
    };
  }

  if (operation.cycleId !== cycleId) findings.push("operation checkpoint does not match the cycle");
  if (!lock) findings.push("operation acquisition lock is missing");
  else if (lock.operationId !== operation.operationId) {
    findings.push("operation acquisition lock belongs to a different operation");
  }
  if (operation.status !== "running") findings.push("operation is already terminal");
  if (operation.ownerHost !== hostname()) findings.push("operation belongs to another host");
  if (!fresh(operation.heartbeatAt, now)) findings.push("operation heartbeat is not fresh");
  if (!alive(operation.ownerPid)) findings.push("operation owner process is not alive");
  if (!operation.childPid) findings.push("operation has no recorded cancellable child process");

  const owner = linuxIdentity(operation.ownerPid);
  const child = operation.childPid ? linuxIdentity(operation.childPid) : null;
  if (!owner || !child) {
    findings.push("Linux process-start identity could not be established");
  } else if (operation.childPid) {
    if (child.parentPid !== operation.ownerPid) {
      findings.push("recorded child PID is no longer owned by the delivery owner process");
    }
    if (child.processGroup !== operation.childPid) {
      findings.push("recorded child PID is not the expected detached process-group leader");
    }
    if (!alive(operation.childPid, true)) findings.push("recorded child process group is not alive");
  }
  if (request && request.operationId !== operation.operationId) {
    findings.push("persisted cancellation request belongs to a previous operation");
  }

  const cancellable =
    operationStatus === "valid" &&
    cancellationStatus !== "invalid" &&
    operation.cycleId === cycleId &&
    lock?.operationId === operation.operationId &&
    operation.status === "running" &&
    operation.ownerHost === hostname() &&
    fresh(operation.heartbeatAt, now) &&
    alive(operation.ownerPid) &&
    Boolean(operation.childPid && owner && child) &&
    child?.parentPid === operation.ownerPid &&
    child?.processGroup === operation.childPid &&
    alive(operation.childPid!, true);

  return {
    operationStatus,
    cancellationStatus,
    cancellable,
    findings: [...new Set(findings)],
    operation: operationView(operation),
    processIdentity:
      owner && child
        ? {
            ownerStartToken: owner.startToken,
            childStartToken: child.startToken,
            childParentPid: child.parentPid,
            childProcessGroup: child.processGroup,
          }
        : null,
    request,
  };
}

function annotateOperation(
  store: EvolutionStore,
  cycleId: string,
  operationId: string,
  request: DeliveryCancellationRecord
): void {
  try {
    const path = pathFor(store, cycleId, "operation.json");
    const operation = readOperation(path);
    if (operation.operationId !== operationId || operation.status !== "running") return;
    const { integrityDigest: _discarded, ...payload } = operation;
    const next = {
      ...payload,
      cancelRequestedAt: request.requestedAt,
      cancelRequestedBy: request.actor,
      cancelSignalAt: request.signalSentAt,
      cancelEvidenceRef: request.evidenceRef,
    };
    atomicWrite(path, { ...next, integrityDigest: digestJson(next) });
  } catch {
    // cancel.json remains authoritative if the heartbeat wins this best-effort race.
  }
}

function signalGroup(childPid: number): boolean {
  if (!Number.isInteger(childPid) || childPid <= 1 || childPid === process.pid) {
    throw new DeliveryCancellationError("refusing to signal an unsafe delivery child PID");
  }
  try {
    process.kill(-childPid, "SIGTERM");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

function limitations() {
  return [
    "cancellation is graceful SIGTERM only and never escalates to SIGKILL",
    "cancellation requires Linux /proc process identity and a fresh operation heartbeat",
    "publication cannot be cancelled until it records a child process",
  ];
}

export async function requestDeliveryCancellation(input: RequestDeliveryCancellationInput) {
  const actor = input.actor.trim();
  const expectedOperationId = input.expectedOperationId.trim();
  if (!actor) throw new DeliveryCancellationError("delivery cancellation actor is required");
  if (!expectedOperationId) {
    throw new DeliveryCancellationError("delivery cancellation requires the exact operation ID");
  }

  const requestedAt = input.now ?? new Date().toISOString();
  const inspection = inspectDeliveryCancellation(input.store, input.cycleId, requestedAt);
  const operation = inspection.operation;
  const existing = inspection.request?.operationId === expectedOperationId ? inspection.request : null;

  if (existing) {
    return {
      cycleId: input.cycleId,
      requestedAt,
      decision: "already-requested" as const,
      applyRequested: input.apply,
      applied: false,
      signalSent: Boolean(existing.signalSentAt),
      inspection,
      cancellation: existing,
      cancellationEvidenceRef: existing.evidenceRef,
      nextAction: "Wait for the owner checkpoint, then inspect delivery recovery.",
      limitations: limitations(),
    };
  }

  const projectRoot = resolve(input.projectRoot);
  if (
    !inspection.cancellable ||
    !operation ||
    operation.projectRoot !== projectRoot ||
    operation.operationId !== expectedOperationId ||
    !inspection.processIdentity ||
    !operation.childPid
  ) {
    return {
      cycleId: input.cycleId,
      requestedAt,
      decision: "blocked" as const,
      applyRequested: input.apply,
      applied: false,
      signalSent: false,
      inspection,
      cancellation: null,
      cancellationEvidenceRef: null,
      nextAction:
        operation?.operationId !== expectedOperationId
          ? "Refresh the workspace and confirm the exact active operation before retrying."
          : operation?.projectRoot !== projectRoot
            ? "The requested repository does not match the active operation checkpoint."
            : "Do not signal this operation; inspect its lock, heartbeat and process relationship first.",
      limitations: limitations(),
    };
  }

  if (!input.apply) {
    return {
      cycleId: input.cycleId,
      requestedAt,
      decision: "request-cancellation" as const,
      applyRequested: false,
      applied: false,
      signalSent: false,
      inspection,
      cancellation: null,
      cancellationEvidenceRef: null,
      nextAction: "Review the exact operation and process identity, then rerun with --apply.",
      limitations: limitations(),
    };
  }

  const identity = inspection.processIdentity;
  const childPid = operation.childPid;
  let cancellation = withRequestDigest({
    schemaVersion: 1,
    recordType: "delivery-cancellation-request",
    cancellationId: `cancellation:${sha256(
      `${input.cycleId}|${expectedOperationId}|${actor}|${requestedAt}|${randomUUID()}`
    ).slice(0, 24)}`,
    cycleId: input.cycleId,
    operationId: expectedOperationId,
    actor,
    requestedAt,
    ownerHost: operation.ownerHost,
    ownerPid: operation.ownerPid,
    ownerStartToken: identity.ownerStartToken,
    childPid,
    childStartToken: identity.childStartToken,
    childParentPid: identity.childParentPid,
    childProcessGroup: identity.childProcessGroup,
    signal: "SIGTERM",
    signalSentAt: null,
    evidenceRef: null,
  });
  const requestPath = pathFor(input.store, input.cycleId, "cancel.json");
  writeRequest(requestPath, cancellation);

  let evidence: { occurrenceId: string };
  try {
    evidence = await new EvidenceRegistry(input.store.rootDir, projectRoot).registerJson(
      "delivery-operation-cancellation",
      {
        schemaVersion: 1,
        recordType: "delivery-operation-cancellation",
        cancellationId: cancellation.cancellationId,
        cycleId: input.cycleId,
        operationId: expectedOperationId,
        actor,
        requestedAt,
        signal: "SIGTERM",
        operation,
        processIdentity: identity,
        findings: inspection.findings,
      }
    );
  } catch (error) {
    rmSync(requestPath, { force: true });
    throw error;
  }

  const evidenceRef = `evidence:${evidence.occurrenceId}`;
  cancellation = writeRequest(requestPath, { ...cancellation, evidenceRef });
  const refreshed = inspectDeliveryCancellation(input.store, input.cycleId);
  if (
    !refreshed.cancellable ||
    refreshed.operation?.operationId !== expectedOperationId ||
    refreshed.operation.childPid !== childPid ||
    refreshed.processIdentity?.ownerStartToken !== identity.ownerStartToken ||
    refreshed.processIdentity?.childStartToken !== identity.childStartToken
  ) {
    return {
      cycleId: input.cycleId,
      requestedAt,
      decision: "blocked" as const,
      applyRequested: true,
      applied: false,
      signalSent: false,
      inspection: refreshed,
      cancellation,
      cancellationEvidenceRef: evidenceRef,
      nextAction: "Operation ownership changed after cancellation intent was persisted; no signal was sent.",
      limitations: [
        "cancellation intent remains durable when a race blocks signalling",
        "cancellation never signals a different process identity",
      ],
    };
  }

  const signalSent = signalGroup(childPid);
  const signalSentAt = signalSent ? new Date().toISOString() : null;
  cancellation = writeRequest(requestPath, { ...cancellation, signalSentAt });
  annotateOperation(input.store, input.cycleId, expectedOperationId, cancellation);
  return {
    cycleId: input.cycleId,
    requestedAt,
    decision: "request-cancellation" as const,
    applyRequested: true,
    applied: true,
    signalSent,
    inspection: refreshed,
    cancellation,
    cancellationEvidenceRef: evidenceRef,
    nextAction: signalSent
      ? "Wait for the owner checkpoint, then inspect delivery recovery."
      : "The child exited before SIGTERM; wait for the owner checkpoint and inspect recovery.",
    limitations: [
      ...limitations(),
      "a cancelled command remains subject to normal fail-closed delivery and recovery reconciliation",
    ],
  };
}

export function showDeliveryCancellation(store: EvolutionStore, cycleId: string) {
  return { deliveryCancellation: inspectDeliveryCancellation(store, cycleId) };
}
