import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EvolutionStore, EvolutionStoreError } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";

const temporaryRoots: string[] = [];

async function temporaryStore(): Promise<EvolutionStore> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-evolution-"));
  temporaryRoots.push(root);
  return new EvolutionStore(join(root, ".shipkit"));
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

    const [cycleDirectory] = await readdir(store.cyclesDir);
    expect(cycleDirectory).toBeTruthy();
    const statePath = join(store.cyclesDir, cycleDirectory!, "state.json");
    await writeFile(statePath, "{broken snapshot", "utf8");

    const recovered = await store.load(created.cycleId);
    expect(recovered).toEqual(observed);
    expect(JSON.parse(await readFile(statePath, "utf8")).cycle.stage).toBe("observed");
  });

  it("ignores an interrupted trailing journal write and recovers the last complete state", async () => {
    const store = await temporaryStore();
    const created = createCycle({
      cycleId: "external-repo:cycle-002",
      objective: "Evaluate three product development opportunities",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);

    const [cycleDirectory] = await readdir(store.cyclesDir);
    const journalPath = join(store.cyclesDir, cycleDirectory!, "events.jsonl");
    const statePath = join(store.cyclesDir, cycleDirectory!, "state.json");
    await appendFile(journalPath, '{"storeSchemaVersion":1,"sequence":1', "utf8");
    await writeFile(statePath, "corrupt", "utf8");

    await expect(store.load(created.cycleId)).resolves.toEqual(created);
  });

  it("rejects stale concurrent writers", async () => {
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
    await store.save(created, firstWriter);

    const staleWriter = transitionCycle(created, "observed", {
      actor: "observer-b",
      reason: "captured baseline B",
      addArtifacts: { baseline: ["evidence:b"] },
    });
    await expect(store.save(created, staleWriter)).rejects.toThrow(/stale cycle state/);
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

    const [cycleDirectory] = await readdir(store.cyclesDir);
    const journalPath = join(store.cyclesDir, cycleDirectory!, "events.jsonl");
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
});
