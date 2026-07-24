import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  inspectDeliveryOperation,
  type DeliveryOperationKind,
  type DeliveryOperationRecord,
} from "./delivery-operation.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";

const DEFAULT_POLL_INTERVAL_MS = 250;
const DEFAULT_EVENT_LIMIT = 100;
const MAX_EVENT_LIMIT = 500;

export class DeliveryProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryProgressError";
  }
}

export type DeliveryProgressPhase =
  | "operation-started"
  | "step-started"
  | "step-exited"
  | "step-result"
  | "operation-completed"
  | "operation-failed";

export type DeliveryProgressStatus =
  | "running"
  | "exited"
  | "passed"
  | "failed"
  | "timed-out"
  | "unavailable"
  | "completed";

export type DeliveryProgressEvent = {
  schemaVersion: 1;
  recordType: "delivery-progress-event";
  integrityDigest: string;
  eventId: string;
  sequence: number;
  previousDigest: string | null;
  cycleId: string;
  operationId: string;
  operation: DeliveryOperationKind;
  occurredAt: string;
  phase: DeliveryProgressPhase;
  status: DeliveryProgressStatus;
  stepIndex: number | null;
  stepId: string | null;
  childPid: number | null;
  executable: string | null;
  exitCode: number | null;
  signal: string | null;
  errorDigest: string | null;
};

export type DeliveryProgressStepResult = {
  stepIndex: number;
  stepId: string;
  executable: string | null;
  status: Extract<DeliveryProgressStatus, "passed" | "failed" | "timed-out" | "unavailable">;
  exitCode: number | null;
  signal?: string | null;
};

export type DeliveryProgressInspection = {
  controlStatus: "missing" | "valid" | "invalid";
  events: DeliveryProgressEvent[];
  latest: DeliveryProgressEvent | null;
  activeStep: DeliveryProgressEvent | null;
  truncated: boolean;
  findings: string[];
};

export type WithDeliveryProgressInput = {
  store: EvolutionStore;
  cycleId: string;
  operation: DeliveryOperationKind;
  plannedStepIds?: string[];
  pollIntervalMs?: number;
};

type AppendProgressInput = Omit<
  DeliveryProgressEvent,
  | "schemaVersion"
  | "recordType"
  | "integrityDigest"
  | "eventId"
  | "sequence"
  | "previousDigest"
>;

type ObservedStep = {
  stepIndex: number;
  stepId: string;
  childPid: number;
  exited: boolean;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function progressDirectory(store: EvolutionStore, cycleId: string): string {
  return join(
    store.rootDir,
    "delivery",
    cycleStorageDirectoryName(cycleId),
    "progress"
  );
}

function portableId(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 96);
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
    // Directory fsync is unavailable on some supported platforms.
  }
}

function eventPayload(
  event: Omit<DeliveryProgressEvent, "integrityDigest">
): Omit<DeliveryProgressEvent, "integrityDigest"> {
  return event;
}

function withDigest(
  event: Omit<DeliveryProgressEvent, "integrityDigest">
): DeliveryProgressEvent {
  return { ...event, integrityDigest: digestJson(eventPayload(event)) };
}

function validOperation(value: unknown): value is DeliveryOperationKind {
  return value === "execute" || value === "verify" || value === "publish";
}

function validPhase(value: unknown): value is DeliveryProgressPhase {
  return (
    value === "operation-started" ||
    value === "step-started" ||
    value === "step-exited" ||
    value === "step-result" ||
    value === "operation-completed" ||
    value === "operation-failed"
  );
}

function validStatus(value: unknown): value is DeliveryProgressStatus {
  return (
    value === "running" ||
    value === "exited" ||
    value === "passed" ||
    value === "failed" ||
    value === "timed-out" ||
    value === "unavailable" ||
    value === "completed"
  );
}

function validNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function validNullableInteger(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0);
}

function readProgressEvent(path: string): DeliveryProgressEvent {
  const value = JSON.parse(readFileSync(path, "utf8")) as DeliveryProgressEvent;
  if (
    value.schemaVersion !== 1 ||
    value.recordType !== "delivery-progress-event" ||
    !value.eventId ||
    !Number.isInteger(value.sequence) ||
    value.sequence <= 0 ||
    !validNullableText(value.previousDigest) ||
    !value.cycleId ||
    !value.operationId ||
    !validOperation(value.operation) ||
    !value.occurredAt ||
    !validPhase(value.phase) ||
    !validStatus(value.status) ||
    !validNullableInteger(value.stepIndex) ||
    !validNullableText(value.stepId) ||
    !validNullableInteger(value.childPid) ||
    !validNullableText(value.executable) ||
    !validNullableInteger(value.exitCode) ||
    !validNullableText(value.signal) ||
    !validNullableText(value.errorDigest)
  ) {
    throw new DeliveryProgressError("delivery progress event has an unsupported shape");
  }
  const { integrityDigest, ...payload } = value;
  if (
    !/^[a-f0-9]{64}$/i.test(integrityDigest) ||
    integrityDigest !== digestJson(payload)
  ) {
    throw new DeliveryProgressError("delivery progress event integrity mismatch");
  }
  return value;
}

function eventFiles(store: EvolutionStore, cycleId: string): string[] {
  const directory = progressDirectory(store, cycleId);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function readAllEvents(
  store: EvolutionStore,
  cycleId: string
): DeliveryProgressEvent[] {
  const directory = progressDirectory(store, cycleId);
  const files = eventFiles(store, cycleId);
  const events: DeliveryProgressEvent[] = [];
  let previousDigest: string | null = null;
  for (const [index, file] of files.entries()) {
    if (!/^\d{8}-[A-Za-z0-9._-]+\.json$/.test(file)) {
      throw new DeliveryProgressError(`unsupported delivery progress filename: ${file}`);
    }
    const event = readProgressEvent(join(directory, file));
    const expectedSequence = index + 1;
    if (event.sequence !== expectedSequence) {
      throw new DeliveryProgressError(
        `delivery progress sequence gap: expected ${expectedSequence}, found ${event.sequence}`
      );
    }
    if (event.cycleId !== cycleId) {
      throw new DeliveryProgressError("delivery progress event cycle mismatch");
    }
    if (event.previousDigest !== previousDigest) {
      throw new DeliveryProgressError("delivery progress digest chain mismatch");
    }
    events.push(event);
    previousDigest = event.integrityDigest;
  }
  return events;
}

function activeStepFor(events: DeliveryProgressEvent[]): DeliveryProgressEvent | null {
  const latestOperationId = events.at(-1)?.operationId;
  if (!latestOperationId) return null;
  let active: DeliveryProgressEvent | null = null;
  for (const event of events) {
    if (event.operationId !== latestOperationId) continue;
    if (event.phase === "step-started") active = event;
    if (
      active &&
      event.stepIndex === active.stepIndex &&
      (event.phase === "step-exited" || event.phase === "step-result")
    ) {
      active = null;
    }
    if (
      event.phase === "operation-completed" ||
      event.phase === "operation-failed"
    ) {
      active = null;
    }
  }
  return active;
}

export function inspectDeliveryProgress(
  store: EvolutionStore,
  cycleId: string,
  limit = DEFAULT_EVENT_LIMIT
): DeliveryProgressInspection {
  const boundedLimit = Math.min(
    MAX_EVENT_LIMIT,
    Math.max(1, Number.isInteger(limit) ? limit : DEFAULT_EVENT_LIMIT)
  );
  try {
    const allEvents = readAllEvents(store, cycleId);
    if (allEvents.length === 0) {
      return {
        controlStatus: "missing",
        events: [],
        latest: null,
        activeStep: null,
        truncated: false,
        findings: [],
      };
    }
    const truncated = allEvents.length > boundedLimit;
    const events = truncated ? allEvents.slice(-boundedLimit) : allEvents;
    return {
      controlStatus: "valid",
      events,
      latest: allEvents.at(-1) ?? null,
      activeStep: activeStepFor(allEvents),
      truncated,
      findings: truncated
        ? [`showing the latest ${boundedLimit} of ${allEvents.length} progress events`]
        : [],
    };
  } catch (error) {
    return {
      controlStatus: "invalid",
      events: [],
      latest: null,
      activeStep: null,
      truncated: false,
      findings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function appendDeliveryProgressEvent(
  store: EvolutionStore,
  input: AppendProgressInput
): DeliveryProgressEvent {
  const inspection = inspectDeliveryProgress(store, input.cycleId, MAX_EVENT_LIMIT);
  if (inspection.controlStatus === "invalid") {
    throw new DeliveryProgressError(
      `cannot append to invalid delivery progress journal: ${inspection.findings.join("; ")}`
    );
  }
  const sequence = (inspection.latest?.sequence ?? 0) + 1;
  const eventId = `progress:${sha256(
    `${input.cycleId}|${input.operationId}|${sequence}|${randomUUID()}`
  ).slice(0, 24)}`;
  const event = withDigest({
    schemaVersion: 1,
    recordType: "delivery-progress-event",
    eventId,
    sequence,
    previousDigest: inspection.latest?.integrityDigest ?? null,
    ...input,
  });
  const filename = `${String(sequence).padStart(8, "0")}-${portableId(eventId)}.json`;
  atomicWriteJsonSync(join(progressDirectory(store, input.cycleId), filename), event);
  return event;
}

function activeOperation(
  store: EvolutionStore,
  cycleId: string,
  operation: DeliveryOperationKind
): DeliveryOperationRecord {
  const inspection = inspectDeliveryOperation(store, cycleId);
  const record = inspection.record;
  if (
    inspection.controlStatus !== "valid" ||
    inspection.disposition !== "active" ||
    !record ||
    record.status !== "running" ||
    record.operation !== operation
  ) {
    throw new DeliveryProgressError(
      `delivery progress requires the exact active ${operation} lease`
    );
  }
  return record;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function stepIdFor(
  operation: DeliveryOperationKind,
  stepIndex: number,
  plannedStepIds: string[]
): string {
  const planned = plannedStepIds[stepIndex - 1]?.trim();
  return planned || `${operation}-step-${stepIndex}`;
}

export async function withDeliveryProgressOperation<T>(
  input: WithDeliveryProgressInput,
  callback: () => Promise<T>,
  summarize?: (value: T) => DeliveryProgressStepResult[]
): Promise<T> {
  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 10) {
    throw new DeliveryProgressError("delivery progress poll interval must be at least 10ms");
  }
  const operation = activeOperation(input.store, input.cycleId, input.operation);
  appendDeliveryProgressEvent(input.store, {
    cycleId: input.cycleId,
    operationId: operation.operationId,
    operation: input.operation,
    occurredAt: new Date().toISOString(),
    phase: "operation-started",
    status: "running",
    stepIndex: null,
    stepId: null,
    childPid: null,
    executable: null,
    exitCode: null,
    signal: null,
    errorDigest: null,
  });

  const plannedStepIds = input.plannedStepIds ?? [];
  const seenPids = new Set<number>();
  let currentStep: ObservedStep | null = null;
  let nextStepIndex = 1;
  let stop = false;
  let monitorFailure: Error | null = null;

  const capture = () => {
    const current = activeOperation(input.store, input.cycleId, input.operation);
    if (current.operationId !== operation.operationId) {
      throw new DeliveryProgressError("delivery operation ownership changed during progress capture");
    }
    const childPid = current.childPid;
    if (childPid && !seenPids.has(childPid)) {
      if (currentStep && !currentStep.exited) {
        appendDeliveryProgressEvent(input.store, {
          cycleId: input.cycleId,
          operationId: operation.operationId,
          operation: input.operation,
          occurredAt: new Date().toISOString(),
          phase: "step-exited",
          status: "exited",
          stepIndex: currentStep.stepIndex,
          stepId: currentStep.stepId,
          childPid: currentStep.childPid,
          executable: null,
          exitCode: null,
          signal: null,
          errorDigest: null,
        });
        currentStep.exited = true;
      }
      const stepIndex = nextStepIndex;
      nextStepIndex += 1;
      const stepId = stepIdFor(input.operation, stepIndex, plannedStepIds);
      currentStep = { stepIndex, stepId, childPid, exited: false };
      seenPids.add(childPid);
      appendDeliveryProgressEvent(input.store, {
        cycleId: input.cycleId,
        operationId: operation.operationId,
        operation: input.operation,
        occurredAt: new Date().toISOString(),
        phase: "step-started",
        status: "running",
        stepIndex,
        stepId,
        childPid,
        executable: null,
        exitCode: null,
        signal: null,
        errorDigest: null,
      });
    }
    if (currentStep && !currentStep.exited && !processAlive(currentStep.childPid)) {
      appendDeliveryProgressEvent(input.store, {
        cycleId: input.cycleId,
        operationId: operation.operationId,
        operation: input.operation,
        occurredAt: new Date().toISOString(),
        phase: "step-exited",
        status: "exited",
        stepIndex: currentStep.stepIndex,
        stepId: currentStep.stepId,
        childPid: currentStep.childPid,
        executable: null,
        exitCode: null,
        signal: null,
        errorDigest: null,
      });
      currentStep.exited = true;
    }
  };

  const monitor = (async () => {
    while (!stop) {
      try {
        capture();
      } catch (error) {
        monitorFailure = error instanceof Error ? error : new Error(String(error));
        return;
      }
      await sleep(pollIntervalMs);
    }
  })();

  try {
    const value = await callback();
    stop = true;
    await monitor;
    capture();
    if (monitorFailure) throw monitorFailure;
    for (const result of summarize?.(value) ?? []) {
      appendDeliveryProgressEvent(input.store, {
        cycleId: input.cycleId,
        operationId: operation.operationId,
        operation: input.operation,
        occurredAt: new Date().toISOString(),
        phase: "step-result",
        status: result.status,
        stepIndex: result.stepIndex,
        stepId: result.stepId,
        childPid: null,
        executable: result.executable,
        exitCode: result.exitCode,
        signal: result.signal ?? null,
        errorDigest: null,
      });
    }
    appendDeliveryProgressEvent(input.store, {
      cycleId: input.cycleId,
      operationId: operation.operationId,
      operation: input.operation,
      occurredAt: new Date().toISOString(),
      phase: "operation-completed",
      status: "completed",
      stepIndex: null,
      stepId: null,
      childPid: null,
      executable: null,
      exitCode: null,
      signal: null,
      errorDigest: null,
    });
    return value;
  } catch (error) {
    stop = true;
    await monitor;
    try {
      appendDeliveryProgressEvent(input.store, {
        cycleId: input.cycleId,
        operationId: operation.operationId,
        operation: input.operation,
        occurredAt: new Date().toISOString(),
        phase: "operation-failed",
        status: "failed",
        stepIndex: null,
        stepId: null,
        childPid: null,
        executable: null,
        exitCode: null,
        signal: null,
        errorDigest: sha256(error instanceof Error ? error.message : String(error)),
      });
    } catch {
      // The original operation error remains authoritative; invalid progress is surfaced by inspection.
    }
    throw error;
  }
}

export function showDeliveryProgress(store: EvolutionStore, cycleId: string) {
  return { deliveryProgress: inspectDeliveryProgress(store, cycleId) };
}
