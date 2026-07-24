import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectDeliveryCancellation,
  requestDeliveryCancellation,
} from "./delivery-cancel.js";
import {
  inspectDeliveryOperation,
  withDeliveryOperation,
  type DeliveryOperationRecord,
} from "./delivery-operation.js";
import { TrustedLocalExecutionBackend } from "./execution-backend.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";

const temporaryRoots: string[] = [];

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function fixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-cancel-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  return {
    projectRoot,
    store: new EvolutionStore(join(root, ".cyclewarden")),
    cycleId: `cancel:${name}`,
  };
}

function operationPath(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId), "operation.json");
}

async function readOperationRecord(
  store: EvolutionStore,
  cycleId: string
): Promise<DeliveryOperationRecord> {
  return JSON.parse(await readFile(operationPath(store, cycleId), "utf8")) as DeliveryOperationRecord;
}

async function writeOperationRecord(
  store: EvolutionStore,
  cycleId: string,
  record: DeliveryOperationRecord
): Promise<void> {
  const { integrityDigest: _discarded, ...payload } = record;
  await writeFile(
    operationPath(store, cycleId),
    `${JSON.stringify({ ...payload, integrityDigest: digestJson(payload) }, null, 2)}\n`,
    "utf8"
  );
}

async function waitFor<T>(read: () => T | null, timeoutMs = 4_000): Promise<T> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = read();
    if (value !== null) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  throw new Error("timed out waiting for cancellation fixture state");
}

function startLongOperation(
  current: Awaited<ReturnType<typeof fixture>>,
  heartbeatIntervalMs = 25
) {
  return withDeliveryOperation(
    {
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "fixture-operator",
      operation: "execute",
      heartbeatIntervalMs,
    },
    async () => {
      const backend = new TrustedLocalExecutionBackend();
      return await backend.execute({
        workspaceRoot: current.projectRoot,
        relativeWorkingDirectory: ".",
        executable: process.execPath,
        arguments: ["-e", "setTimeout(() => process.exit(0), 10000)"],
        environment: { PATH: process.env.PATH, CI: "true" },
        limits: { timeoutMs: 15_000, maxOutputBytes: 4_096 },
      });
    }
  );
}

async function cancelForCleanup(
  current: Awaited<ReturnType<typeof fixture>>,
  operationId: string
): Promise<void> {
  await requestDeliveryCancellation({
    store: current.store,
    cycleId: current.cycleId,
    projectRoot: current.projectRoot,
    actor: "cleanup-operator",
    expectedOperationId: operationId,
    apply: true,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe.skipIf(process.platform !== "linux")(
  "delivery operation graceful cancellation",
  () => {
    it("is read-only by default, then SIGTERMs the exact active child and persists evidence", async () => {
      const current = await fixture("apply");
      const operation = startLongOperation(current);
      const active = await waitFor(() => {
        const inspection = inspectDeliveryOperation(current.store, current.cycleId);
        return inspection.record?.childPid && inspection.disposition === "active" ? inspection : null;
      });
      const operationId = active.record!.operationId;

      const plan = await requestDeliveryCancellation({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "cancellation-operator",
        expectedOperationId: operationId,
        apply: false,
      });
      expect(plan.decision).toBe("request-cancellation");
      expect(plan.applied).toBe(false);
      expect(inspectDeliveryCancellation(current.store, current.cycleId).request).toBeNull();

      const applied = await requestDeliveryCancellation({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "cancellation-operator",
        expectedOperationId: operationId,
        apply: true,
      });
      expect(applied.applied).toBe(true);
      expect(applied.signalSent).toBe(true);
      expect(applied.cancellationEvidenceRef).toMatch(/^evidence:/);

      const completed = await operation;
      expect(completed.value.status).toBe("failed");
      expect(completed.operation.status).toBe("completed");
      const cancellation = inspectDeliveryCancellation(current.store, current.cycleId);
      expect(cancellation.request?.operationId).toBe(operationId);
      expect(cancellation.request?.actor).toBe("cancellation-operator");
      expect(cancellation.request?.signalSentAt).not.toBeNull();
      const finalOperation = inspectDeliveryOperation(current.store, current.cycleId);
      expect(finalOperation.disposition).toBe("healthy");
      expect(finalOperation.lockPresent).toBe(false);
    });

    it("blocks a stale UI request whose expected operation ID no longer matches", async () => {
      const current = await fixture("mismatch");
      const operation = startLongOperation(current);
      const active = await waitFor(() => {
        const inspection = inspectDeliveryOperation(current.store, current.cycleId);
        return inspection.record?.childPid ? inspection : null;
      });

      const blocked = await requestDeliveryCancellation({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "cancellation-operator",
        expectedOperationId: "operation:stale-browser-state",
        apply: true,
      });
      expect(blocked.decision).toBe("blocked");
      expect(blocked.applied).toBe(false);
      expect(inspectDeliveryCancellation(current.store, current.cycleId).request).toBeNull();

      await cancelForCleanup(current, active.record!.operationId);
      await operation;
    });

    it("blocks signalling when the recorded child no longer matches the owner relationship", async () => {
      const current = await fixture("identity-mismatch");
      const operation = startLongOperation(current, 60_000);
      const active = await waitFor(() => {
        const inspection = inspectDeliveryOperation(current.store, current.cycleId);
        return inspection.record?.childPid ? inspection : null;
      });
      const original = await readOperationRecord(current.store, current.cycleId);
      await writeOperationRecord(current.store, current.cycleId, {
        ...original,
        childPid: process.pid,
      });

      const inspected = inspectDeliveryCancellation(current.store, current.cycleId);
      expect(inspected.cancellable).toBe(false);
      expect(inspected.findings.join(" ")).toMatch(/no longer owned|process-group leader/);
      const blocked = await requestDeliveryCancellation({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "cancellation-operator",
        expectedOperationId: active.record!.operationId,
        apply: true,
      });
      expect(blocked.decision).toBe("blocked");
      expect(blocked.applied).toBe(false);

      await writeOperationRecord(current.store, current.cycleId, original);
      await cancelForCleanup(current, active.record!.operationId);
      await operation;
    });

    it("blocks cancellation when the repository does not match the active operation", async () => {
      const current = await fixture("root-mismatch");
      const otherRoot = join(current.projectRoot, "other");
      await mkdir(otherRoot, { recursive: true });
      const operation = startLongOperation(current);
      const active = await waitFor(() => {
        const inspection = inspectDeliveryOperation(current.store, current.cycleId);
        return inspection.record?.childPid ? inspection : null;
      });

      const blocked = await requestDeliveryCancellation({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: otherRoot,
        actor: "cancellation-operator",
        expectedOperationId: active.record!.operationId,
        apply: true,
      });
      expect(blocked.decision).toBe("blocked");
      expect(blocked.applied).toBe(false);
      expect(blocked.nextAction).toMatch(/repository does not match/);

      await cancelForCleanup(current, active.record!.operationId);
      await operation;
    });
  }
);
