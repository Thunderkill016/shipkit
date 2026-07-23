import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  CURRENT_STORE_SCHEMA_VERSION,
  EvolutionStore,
  EvolutionStoreError,
  cycleStorageDirectoryName,
  type EvolutionStoreOptions,
} from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";

const temporaryRoots: string[] = [];

async function temporaryStore(options: EvolutionStoreOptions = {}): Promise<EvolutionStore> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-evolution-"));
  temporaryRoots.push(root);
  return new EvolutionStore(join(root, ".shipkit"), options);
}

function cyclePaths(store: EvolutionStore, cycleId: string) {
  const cycleDir = join(store.cyclesDir, cycleStorageDirectoryName(cycleId));
  return {
    cycleDir,
    statePath: join(cycleDir, "state.json"),
    journalPath: join(cycleDir, "events.jsonl"),
    lockPath: join(cycleDir, ".write.lock"),
  };
}

async function legacyFixture() {
  const path = fileURLToPath(new URL("./fixtures/persistence/store-v1.json", import.meta.url));
  return JSON.parse(await readFile(path, "utf8"));
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("EvolutionStore", () => {
  it("persists a transition and recovers a corrupt snapshot from the journal", async () => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: "external-repo:cycle-001",
      objective: "Research and improve onboarding completion",
      autonomy: "A3",
      risk: "R1",
      now: "2026-07-23T00:00:00.000Z",
    });
    await store.create(created);

    const observed = transitionCycle(created, "observed", {
      actor: "project-observer",
      reason: "captured repository baseline",
      now: "2026-07-23T00:01:00.000Z",
      addArtifacts: { baseline: ["evidence:baseline.json"] },
    });
    await store.save(created, observed);

    const { statePath } = cyclePaths(store, created.cycleId);
    await writeFile(statePath, "{broken snapshot", "utf8");

    const recovered = await store.load(created.cycleId);
    expect(recovered).toEqual(observed);
    const envelope = JSON.parse(await readFile(statePath, "utf8"));
    expect(envelope.storeSchemaVersion).toBe(CURRENT_STORE_SCHEMA_VERSION);
    expect(envelope.cycle.stage).toBe("observed");
  });

  it("ignores only an interrupted trailing JSON write and recovers the last complete state", async () => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: "external-repo:cycle-002",
      objective: "Evaluate three product development opportunities",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);

    const { journalPath, statePath } = cyclePaths(store, created.cycleId);
    await appendFile(journalPath, '{"storeSchemaVersion":2,"sequence":1', "utf8");
    await writeFile(statePath, "corrupt", "utf8");

    await expect(store.load(created.cycleId)).resolves.toEqual(created);
  });

  it("migrates the released v1 envelope and appends a checksum-chained v2 record", async () => {
    const store = await temporaryStore();
    await store.initializeProject();
    const fixture = await legacyFixture();
    const { cycleDir, journalPath, statePath } = cyclePaths(store, fixture.cycle.cycleId);
    await mkdir(cycleDir, { recursive: true });
    await writeFile(journalPath, `${JSON.stringify(fixture)}\n`, "utf8");
    await writeFile(statePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

    const loaded = await store.load(fixture.cycle.cycleId);
    expect(loaded).toEqual(fixture.cycle);
    const migratedState = JSON.parse(await readFile(statePath, "utf8"));
    expect(migratedState).toMatchObject({
      storeSchemaVersion: CURRENT_STORE_SCHEMA_VERSION,
      sequence: 0,
      previousChecksum: null,
      checksum: fixture.checksum,
    });

    const observed = transitionCycle(loaded, "observed", {
      actor: "migration-test",
      reason: "prove mixed-version journal continuation",
      addArtifacts: { baseline: ["evidence:migrated"] },
    });
    await store.save(loaded, observed);

    const records = (await readFile(journalPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(records.map((record) => record.storeSchemaVersion)).toEqual([1, 2]);
    expect(records[1]).toMatchObject({ sequence: 1, previousChecksum: fixture.checksum });
    await expect(store.load(loaded.cycleId)).resolves.toEqual(observed);
  });

  it("migrates a released v1 project config deterministically", async () => {
    const store = await temporaryStore();
    await mkdir(store.rootDir, { recursive: true });
    const configPath = join(store.rootDir, "config.json");
    await writeFile(
      configPath,
      `${JSON.stringify({
        schemaVersion: 1,
        projectRoot: "/tmp/legacy-project",
        projectName: "legacy-project",
        createdAt: "2026-07-23T00:00:00.000Z",
      })}\n`,
      "utf8"
    );

    await store.initializeProject("/tmp/ignored-new-root");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    expect(config).toMatchObject({
      schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
      projectRoot: "/tmp/legacy-project",
      projectName: "legacy-project",
      createdAt: "2026-07-23T00:00:00.000Z",
    });
    expect(Date.parse(config.migratedAt)).not.toBeNaN();
  });

  it("fails closed on an unsupported released-store version", async () => {
    const store = await temporaryStore();
    await store.initializeProject();
    const fixture = await legacyFixture();
    fixture.storeSchemaVersion = 99;
    const { cycleDir, journalPath, statePath } = cyclePaths(store, fixture.cycle.cycleId);
    await mkdir(cycleDir, { recursive: true });
    await writeFile(journalPath, `${JSON.stringify(fixture)}\n`, "utf8");
    await writeFile(statePath, `${JSON.stringify(fixture)}\n`, "utf8");

    await expect(store.load(fixture.cycle.cycleId)).rejects.toThrow(
      /unsupported store schemaVersion: 99/
    );
  });

  it.each([
    ["duplicate", 0],
    ["missing", 2],
  ])("rejects a complete %s journal sequence", async (_name, sequence) => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: `external-repo:sequence-${sequence}`,
      objective: "Reject duplicate and missing journal sequences",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);
    const { journalPath } = cyclePaths(store, created.cycleId);
    const first = JSON.parse((await readFile(journalPath, "utf8")).trim());
    await appendFile(
      journalPath,
      `${JSON.stringify({
        ...first,
        sequence,
        previousChecksum: first.checksum,
      })}\n`,
      "utf8"
    );

    await expect(store.load(created.cycleId)).rejects.toThrow(/journal sequence mismatch/);
  });

  it("serializes competing writers and accepts exactly one transition in one process", async () => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: "external-repo:cycle-003",
      objective: "Improve product research evidence quality",
      autonomy: "A3",
      risk: "R1",
    });
    await store.create(created);

    const firstWriter = transitionCycle(created, "observed", {
      actor: "observer-a",
      reason: "captured baseline A",
      addArtifacts: { baseline: ["evidence:a"] },
    });
    const secondWriter = transitionCycle(created, "observed", {
      actor: "observer-b",
      reason: "captured baseline B",
      addArtifacts: { baseline: ["evidence:b"] },
    });

    const results = await Promise.allSettled([
      store.save(created, firstWriter),
      store.save(created, secondWriter),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(store.load(created.cycleId)).resolves.toMatchObject({
      stage: "observed",
      history: [expect.objectContaining({ to: "observed" })],
    });

    const { journalPath } = cyclePaths(store, created.cycleId);
    const journal = await readFile(journalPath, "utf8");
    expect(journal.trim().split("\n")).toHaveLength(2);
  });

  it("reclaims a lock owned by a dead process", async () => {
    const store = await temporaryStore({ lockTimeoutMs: 500, staleLockMs: 50 });
    const created = createCycle({
      cycleId: "external-repo:dead-lock",
      objective: "Recover safely after a writer process terminates",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);
    const { lockPath } = cyclePaths(store, created.cycleId);
    await writeFile(
      lockPath,
      `${JSON.stringify({
        token: "dead-writer",
        pid: 2_147_483_647,
        acquiredAt: new Date().toISOString(),
      })}\n`,
      "utf8"
    );

    const observed = transitionCycle(created, "observed", {
      actor: "recovery-writer",
      reason: "reclaimed dead process lock",
      addArtifacts: { baseline: ["evidence:recovered"] },
    });
    await expect(store.save(created, observed)).resolves.toEqual(observed);
  });

  it("does not steal an old lock from a live process", async () => {
    const store = await temporaryStore({ lockTimeoutMs: 100, staleLockMs: 1 });
    const created = createCycle({
      cycleId: "external-repo:live-lock",
      objective: "Keep active writers protected from lock theft",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);
    const { lockPath } = cyclePaths(store, created.cycleId);
    await writeFile(
      lockPath,
      `${JSON.stringify({
        token: "live-writer",
        pid: process.pid,
        acquiredAt: "2020-01-01T00:00:00.000Z",
      })}\n`,
      "utf8"
    );
    const old = new Date("2020-01-01T00:00:00.000Z");
    await utimes(lockPath, old, old);

    const observed = transitionCycle(created, "observed", {
      actor: "competing-writer",
      reason: "must not steal a live lock",
      addArtifacts: { baseline: ["evidence:blocked"] },
    });
    await expect(store.save(created, observed)).rejects.toThrow(/timed out acquiring cycle lock/);
  });

  it("fails closed when a completed journal record is tampered with", async () => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: "external-repo:cycle-004",
      objective: "Protect the evidence chain from silent tampering",
      autonomy: "A2",
      risk: "R2",
    });
    await store.create(created);

    const { journalPath } = cyclePaths(store, created.cycleId);
    const source = await readFile(journalPath, "utf8");
    const record = JSON.parse(source.trim());
    record.checksum = "0".repeat(64);
    await writeFile(journalPath, `${JSON.stringify(record)}\n`, "utf8");

    await expect(store.load(created.cycleId)).rejects.toBeInstanceOf(EvolutionStoreError);
  });

  it("lists persisted cycles without loading model providers", async () => {
    const store = await temporaryStore();
    const cycle = createCycle({
      cycleId: "external-repo:cycle-005",
      objective: "Discover a measurable product opportunity",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(cycle);

    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({ cycleId: cycle.cycleId, stage: "created" }),
    ]);
  });

  it("keeps a live writer snapshot temporary file intact", async () => {
    const store = await temporaryStore();
    const cycle = createCycle({
      cycleId: "external-repo:live-temp",
      objective: "Do not race an active snapshot writer",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(cycle);
    const { cycleDir, statePath } = cyclePaths(store, cycle.cycleId);
    const activeTemporary = `${statePath}.${process.pid}.active.tmp`;
    await writeFile(activeTemporary, "active writer", "utf8");

    await store.load(cycle.cycleId);
    expect(await readdir(cycleDir)).toContain(activeTemporary.split("/").at(-1));
  });
});
