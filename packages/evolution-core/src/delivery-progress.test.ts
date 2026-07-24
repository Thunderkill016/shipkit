import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectDeliveryProgress,
  withDeliveryProgressOperation,
} from "./delivery-progress.js";
import { withDeliveryOperation } from "./delivery-operation.js";
import { TrustedLocalExecutionBackend } from "./execution-backend.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";

const temporaryRoots: string[] = [];

async function fixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-progress-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  return {
    root,
    projectRoot,
    store: new EvolutionStore(join(root, ".cyclewarden")),
    cycleId: `progress:${name}`,
  };
}

function progressDirectory(store: EvolutionStore, cycleId: string): string {
  return join(
    store.rootDir,
    "delivery",
    cycleStorageDirectoryName(cycleId),
    "progress"
  );
}

async function runObservedCommand(current: Awaited<ReturnType<typeof fixture>>) {
  return await withDeliveryOperation(
    {
      store: current.store,
      cycleId: current.cycleId,
      projectRoot: current.projectRoot,
      actor: "progress-operator",
      operation: "execute",
      heartbeatIntervalMs: 20,
    },
    () =>
      withDeliveryProgressOperation(
        {
          store: current.store,
          cycleId: current.cycleId,
          operation: "execute",
          plannedStepIds: ["implementation"],
          pollIntervalMs: 10,
        },
        async () => {
          const backend = new TrustedLocalExecutionBackend();
          return await backend.execute({
            workspaceRoot: current.projectRoot,
            relativeWorkingDirectory: ".",
            executable: process.execPath,
            arguments: ["-e", "setTimeout(() => process.exit(0), 120)"],
            environment: { PATH: process.env.PATH, CI: "true" },
            limits: { timeoutMs: 2_000, maxOutputBytes: 4_096 },
          });
        },
        (result) => [
          {
            stepIndex: 1,
            stepId: "implementation",
            executable: "node",
            status: result.status,
            exitCode: result.exitCode,
            signal: result.signal,
          },
        ]
      )
  );
}

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("durable delivery progress events", () => {
  it("records an append-only operation and command timeline", async () => {
    const current = await fixture("timeline");
    const result = await runObservedCommand(current);
    expect(result.value.status).toBe("passed");

    const inspection = inspectDeliveryProgress(current.store, current.cycleId);
    expect(inspection.controlStatus).toBe("valid");
    expect(inspection.activeStep).toBeNull();
    expect(inspection.events.map((event) => event.sequence)).toEqual(
      inspection.events.map((_, index) => index + 1)
    );
    expect(inspection.events.map((event) => event.phase)).toContain("operation-started");
    expect(inspection.events.map((event) => event.phase)).toContain("step-started");
    expect(inspection.events.map((event) => event.phase)).toContain("step-result");
    expect(inspection.events.at(-1)?.phase).toBe("operation-completed");
    expect(
      inspection.events.find((event) => event.phase === "step-result")?.status
    ).toBe("passed");
  });

  it("chains progress across multiple operations for the same cycle", async () => {
    const current = await fixture("chain");
    await runObservedCommand(current);
    await runObservedCommand(current);

    const inspection = inspectDeliveryProgress(current.store, current.cycleId, 500);
    expect(inspection.controlStatus).toBe("valid");
    expect(new Set(inspection.events.map((event) => event.operationId)).size).toBe(2);
    for (const [index, event] of inspection.events.entries()) {
      expect(event.sequence).toBe(index + 1);
      expect(event.previousDigest).toBe(
        index === 0 ? null : inspection.events[index - 1]?.integrityDigest
      );
    }
  });

  it("fails closed when an event is modified without updating its digest", async () => {
    const current = await fixture("tamper");
    await runObservedCommand(current);
    const directory = progressDirectory(current.store, current.cycleId);
    const [first] = (await readdir(directory)).sort();
    expect(first).toBeTruthy();
    const path = join(directory, first!);
    const event = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    event.stepId = "tampered";
    await writeFile(path, `${JSON.stringify(event, null, 2)}\n`, "utf8");

    const inspection = inspectDeliveryProgress(current.store, current.cycleId);
    expect(inspection.controlStatus).toBe("invalid");
    expect(inspection.findings.join(" ")).toMatch(/integrity mismatch/);
  });

  it("rejects a digest-chain rewrite even when the modified event is re-digested", async () => {
    const current = await fixture("chain-tamper");
    await runObservedCommand(current);
    const directory = progressDirectory(current.store, current.cycleId);
    const files = (await readdir(directory)).sort();
    expect(files.length).toBeGreaterThan(1);
    const path = join(directory, files[1]!);
    const event = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    event.previousDigest = "0".repeat(64);
    const { integrityDigest: _discarded, ...payload } = event;
    event.integrityDigest = digestJson(payload);
    await writeFile(path, `${JSON.stringify(event, null, 2)}\n`, "utf8");

    const inspection = inspectDeliveryProgress(current.store, current.cycleId);
    expect(inspection.controlStatus).toBe("invalid");
    expect(inspection.findings.join(" ")).toMatch(/digest chain mismatch/);
  });
});
