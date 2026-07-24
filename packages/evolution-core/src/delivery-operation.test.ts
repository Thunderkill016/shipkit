import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectDeliveryOperation,
  reconcileDeliveryOperation,
  showDeliveryOperation,
  withDeliveryOperation,
  type DeliveryOperationRecord,
} from "./delivery-operation.js";
import { TrustedLocalExecutionBackend } from "./execution-backend.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";

const temporaryRoots: string[] = [];

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function operationPath(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId), "operation.json");
}

function lockPath(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId), "operation.lock");
}

async function fixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-operation-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  return {
    root,
    projectRoot,
    store: new EvolutionStore(join(root, ".cyclewarden")),
    cycleId: `operation:${name}`,
  };
}

async function waitFor<T>(read: () => T | null, timeoutMs = 3_000): Promise<T> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = read();
    if (value !== null) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  throw new Error("timed out waiting for delivery operation state");
}

async function replaceRecord(
  store: EvolutionStore,
  cycleId: string,
  mutate: (record: DeliveryOperationRecord) => DeliveryOperationRecord
): Promise<void> {
  const path = operationPath(store, cycleId);
  const current = JSON.parse(await readFile(path, "utf8")) as DeliveryOperationRecord;
  const mutated = mutate(current);
  const { integrityDigest: _discarded, ...payload } = mutated;
  await writeFile(
    path,
    `${JSON.stringify({ ...payload, integrityDigest: digestJson(payload) }, null, 2)}\n`,
    "utf8"
  );
}

async function createLockCopy(store: EvolutionStore, cycleId: string): Promise<void> {
  await mkdir(dirname(lockPath(store, cycleId)), { recursive: true });
  await copyFile(operationPath(store, cycleId), lockPath(store, cycleId));
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("delivery operation checkpoints and process leases", () => {
  it("writes a running checkpoint before callback work and completes it durably", async () => {
    const current = await fixture("write-ahead");
    const result = await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "fixture-operator",
        operation: "execute",
        heartbeatIntervalMs: 25,
      },
      async () => {
        const inspection = inspectDeliveryOperation(current.store, current.cycleId);
        expect(inspection.disposition).toBe("active");
        expect(inspection.record?.status).toBe("running");
        expect(inspection.record?.ownerPid).toBe(process.pid);
        return "completed-value";
      }
    );

    expect(result.value).toBe("completed-value");
    expect(result.operation.status).toBe("completed");
    expect(result.operation.completedAt).not.toBeNull();
    const inspection = showDeliveryOperation(current.store, current.cycleId).deliveryOperation;
    expect(inspection.disposition).toBe("healthy");
    expect(inspection.lockPresent).toBe(false);
  });

  it("blocks a second operation while the first owner lease is active", async () => {
    const current = await fixture("overlap");
    let release!: () => void;
    const gate = new Promise<void>((resolvePromise) => {
      release = resolvePromise;
    });
    const first = withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "first-operator",
        operation: "execute",
      },
      async () => {
        await gate;
        return "done";
      }
    );

    await waitFor(() =>
      inspectDeliveryOperation(current.store, current.cycleId).disposition === "active"
        ? true
        : null
    );
    await expect(
      withDeliveryOperation(
        {
          store: current.store,
          cycleId: current.cycleId,
          projectRoot: current.projectRoot,
          actor: "second-operator",
          operation: "verify",
        },
        async () => "should-not-run"
      )
    ).rejects.toThrow(/cannot start verify|operation lease is active/);

    release();
    await first;
  });

  it("records the spawned trusted-local child PID inside the active lease", async () => {
    const current = await fixture("child-pid");
    await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "fixture-operator",
        operation: "verify",
      },
      async () => {
        const backend = new TrustedLocalExecutionBackend();
        const run = backend.execute({
          workspaceRoot: current.projectRoot,
          relativeWorkingDirectory: ".",
          executable: process.execPath,
          arguments: ["-e", "setTimeout(() => process.exit(0), 250)"],
          environment: { PATH: process.env.PATH, CI: "true" },
          limits: { timeoutMs: 2_000, maxOutputBytes: 4_096 },
        });
        const childPid = await waitFor(() => {
          const pid = inspectDeliveryOperation(current.store, current.cycleId).record?.childPid;
          return pid ? pid : null;
        });
        expect(childPid).not.toBe(process.pid);
        expect(inspectDeliveryOperation(current.store, current.cycleId).childState).toBe("alive");
        expect((await run).status).toBe("passed");
        return childPid;
      }
    );
  });

  it("clears a dead stale lease only after explicit apply and records evidence", async () => {
    const current = await fixture("stale");
    await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "fixture-operator",
        operation: "execute",
      },
      async () => "done"
    );
    await replaceRecord(current.store, current.cycleId, (record) => ({
      ...record,
      ownerPid: 999_999_999,
      childPid: null,
      completedAt: null,
      status: "running",
      recoveryEvidenceRef: null,
    }));
    await createLockCopy(current.store, current.cycleId);

    const inspected = await reconcileDeliveryOperation({
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "recovery-operator",
      apply: false,
    });
    expect(inspected.decision).toBe("clear-stale");
    expect(inspected.applied).toBe(false);
    expect(inspected.inspection.ownerState).toBe("dead");

    const applied = await reconcileDeliveryOperation({
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "recovery-operator",
      apply: true,
    });
    expect(applied.applied).toBe(true);
    expect(applied.record?.status).toBe("abandoned");
    expect(applied.recoveryEvidenceRef).toMatch(/^evidence:/);
    expect(inspectDeliveryOperation(current.store, current.cycleId).lockPresent).toBe(false);
  });

  it("prefers a different active acquisition lock over an older terminal checkpoint", async () => {
    const current = await fixture("newer-acquisition");
    await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "previous-operator",
        operation: "execute",
      },
      async () => "done"
    );
    const previous = JSON.parse(
      await readFile(operationPath(current.store, current.cycleId), "utf8")
    ) as DeliveryOperationRecord;
    const acquisition = {
      ...previous,
      operationId: "operation:newer-acquisition",
      actor: "active-operator",
      ownerPid: process.pid,
      childPid: null,
      startedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      completedAt: null,
      status: "running" as const,
      errorDigest: null,
      recoveryEvidenceRef: null,
    };
    const { integrityDigest: _discarded, ...payload } = acquisition;
    await writeFile(
      lockPath(current.store, current.cycleId),
      `${JSON.stringify({ ...payload, integrityDigest: digestJson(payload) }, null, 2)}\n`,
      "utf8"
    );

    const inspection = inspectDeliveryOperation(current.store, current.cycleId);
    expect(inspection.disposition).toBe("active");
    expect(inspection.record?.operationId).toBe(acquisition.operationId);
    expect(inspection.findings.join(" ")).toMatch(/different operation.*authoritative/);

    const recovery = await reconcileDeliveryOperation({
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "recovery-operator",
      apply: true,
    });
    expect(recovery.decision).toBe("blocked");
    expect(recovery.applied).toBe(false);
    expect(recovery.record?.operationId).toBe(acquisition.operationId);
  });

  it("recovers an acquisition lock when the primary checkpoint was never renamed", async () => {
    const current = await fixture("acquisition-only");
    await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "fixture-operator",
        operation: "execute",
      },
      async () => "done"
    );
    await replaceRecord(current.store, current.cycleId, (record) => ({
      ...record,
      ownerPid: 999_999_999,
      childPid: null,
      completedAt: null,
      status: "running",
      recoveryEvidenceRef: null,
    }));
    await createLockCopy(current.store, current.cycleId);
    await unlink(operationPath(current.store, current.cycleId));

    const inspection = inspectDeliveryOperation(current.store, current.cycleId);
    expect(inspection.controlStatus).toBe("valid");
    expect(inspection.disposition).toBe("stale");
    expect(inspection.findings.join(" ")).toMatch(/acquisition lock record/);

    const applied = await reconcileDeliveryOperation({
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "recovery-operator",
      apply: true,
    });
    expect(applied.applied).toBe(true);
    expect(applied.record?.status).toBe("abandoned");
    expect(inspectDeliveryOperation(current.store, current.cycleId).lockPresent).toBe(false);
  });

  it("refuses to clear a lease while a recorded child process is alive", async () => {
    const current = await fixture("live-child");
    await withDeliveryOperation(
      {
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor: "fixture-operator",
        operation: "execute",
      },
      async () => "done"
    );
    await replaceRecord(current.store, current.cycleId, (record) => ({
      ...record,
      ownerPid: 999_999_999,
      childPid: process.pid,
      completedAt: null,
      status: "running",
    }));
    await createLockCopy(current.store, current.cycleId);

    const result = await reconcileDeliveryOperation({
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "recovery-operator",
      apply: true,
    });
    expect(result.decision).toBe("blocked");
    expect(result.applied).toBe(false);
    expect(result.inspection.childState).toBe("alive");
    expect(result.record?.status).toBe("running");
  });
});
