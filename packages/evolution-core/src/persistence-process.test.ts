import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";

const temporaryRoots: string[] = [];
const workerPath = fileURLToPath(new URL("./fixtures/persistence-worker.mjs", import.meta.url));

type WorkerResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

async function temporaryStore(): Promise<EvolutionStore> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-persistence-process-"));
  temporaryRoots.push(root);
  return new EvolutionStore(join(root, ".shipkit"), {
    lockTimeoutMs: 10_000,
    staleLockMs: 100,
  });
}

function spawnWriter(input: {
  store: EvolutionStore;
  cycleId: string;
  actor: string;
  gatePath: string;
  readyPath: string;
  crashPoint?: string;
}) {
  const child = spawn(
    process.execPath,
    [workerPath, input.store.rootDir, input.cycleId, input.actor, input.gatePath, input.readyPath],
    {
      env: {
        ...process.env,
        ...(input.crashPoint
          ? { SHIPKIT_PERSISTENCE_CRASH_POINT: input.crashPoint }
          : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const completion = new Promise<WorkerResult>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  return { child, completion };
}

async function waitForPath(path: string, timeoutMs = 10_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await access(path);
      return;
    } catch {
      await delay(10);
    }
  }
  throw new Error(`timed out waiting for ${path}`);
}

function processPaths(store: EvolutionStore, cycleId: string, label: string) {
  const directory = join(store.rootDir, "process-tests");
  return {
    directory,
    gatePath: join(directory, `${cycleId.replaceAll(":", "-")}-${label}.gate`),
    readyPath: join(directory, `${cycleId.replaceAll(":", "-")}-${label}.ready`),
  };
}

async function createProcessCycle(store: EvolutionStore, cycleId: string) {
  const cycle = createCycle({
    cycleId,
    objective: "Prove crash-safe and serialized persistence behavior",
    autonomy: "A2",
    risk: "R1",
  });
  await store.create(cycle);
  return cycle;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("EvolutionStore process boundaries", () => {
  const crashPoints = [
    "journal:after-open",
    "journal:after-write",
    "journal:after-sync",
    "snapshot:after-temp-open",
    "snapshot:after-temp-write",
    "snapshot:after-temp-sync",
    "snapshot:after-rename",
    "snapshot:after-directory-sync",
  ];

  it.each(crashPoints)(
    "recovers one legal state after SIGKILL at %s",
    async (crashPoint) => {
      if (process.platform === "win32") return;
      const store = await temporaryStore();
      const cycleId = `process:crash-${crashPoint.replaceAll(":", "-")}`;
      await createProcessCycle(store, cycleId);
      const paths = processPaths(store, cycleId, crashPoint.replaceAll(":", "-"));
      await writeFile(join(store.rootDir, ".process-tests-placeholder"), "", "utf8");
      await import("node:fs/promises").then(({ mkdir }) => mkdir(paths.directory, { recursive: true }));

      const writer = spawnWriter({
        store,
        cycleId,
        actor: `fault-${crashPoint}`,
        gatePath: paths.gatePath,
        readyPath: paths.readyPath,
        crashPoint,
      });
      await waitForPath(paths.readyPath);
      await writeFile(paths.gatePath, "go\n", "utf8");
      const result = await writer.completion;
      expect(result.signal, result.stderr).toBe("SIGKILL");

      const recovered = await store.load(cycleId);
      if (crashPoint === "journal:after-open") {
        expect(recovered.stage).toBe("created");
      } else {
        expect(recovered.stage).toBe("observed");
      }

      const continued =
        recovered.stage === "created"
          ? transitionCycle(recovered, "observed", {
              actor: "post-crash-recovery",
              reason: "reclaimed dead writer lock and committed the baseline",
              addArtifacts: { baseline: ["evidence:post-crash"] },
            })
          : transitionCycle(recovered, "modeled", {
              actor: "post-crash-recovery",
              reason: "reclaimed dead writer lock and continued the cycle",
              addArtifacts: { model: ["evidence:post-crash-model"] },
            });
      await expect(store.save(recovered, continued)).resolves.toEqual(continued);

      const cycleDir = join(store.cyclesDir, cycleStorageDirectoryName(cycleId));
      const journal = await readFile(join(cycleDir, "events.jsonl"), "utf8");
      expect(journal.trim().split("\n")).toHaveLength(continued.history.length + 1);
      expect((await readdir(cycleDir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
      await expect(store.load(cycleId)).resolves.toEqual(continued);
    },
    20_000
  );

  it(
    "allows exactly one of eight synchronized processes to commit the next sequence",
    async () => {
      const store = await temporaryStore();
      const cycleId = "process:writer-stress";
      await createProcessCycle(store, cycleId);
      const directory = join(store.rootDir, "process-tests");
      await import("node:fs/promises").then(({ mkdir }) => mkdir(directory, { recursive: true }));
      const gatePath = join(directory, "writer-stress.gate");

      const writers = Array.from({ length: 8 }, (_, index) => {
        const actor = `writer-${index + 1}`;
        const readyPath = join(directory, `${actor}.ready`);
        return {
          actor,
          readyPath,
          worker: spawnWriter({ store, cycleId, actor, gatePath, readyPath }),
        };
      });

      await Promise.all(writers.map((writer) => waitForPath(writer.readyPath)));
      await writeFile(gatePath, "go\n", "utf8");
      const results = await Promise.all(writers.map((writer) => writer.worker.completion));
      const successes = results.filter((result) => result.code === 0);
      const rejected = results.filter((result) => result.code === 2);
      expect(successes).toHaveLength(1);
      expect(rejected).toHaveLength(7);
      expect(rejected.every((result) => /stale cycle state/.test(result.stderr))).toBe(true);

      const loaded = await store.load(cycleId);
      expect(loaded).toMatchObject({
        stage: "observed",
        history: [expect.objectContaining({ to: "observed" })],
      });
      const cycleDir = join(store.cyclesDir, cycleStorageDirectoryName(cycleId));
      const journal = await readFile(join(cycleDir, "events.jsonl"), "utf8");
      expect(journal.trim().split("\n")).toHaveLength(2);
    },
    30_000
  );
});
