import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { executeDelivery, verifyDelivery } from "./delivery.js";
import { EvolutionStore } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, ExecutionHandoff, EvolutionStage } from "./types.js";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];

async function run(cwd: string, executable: string, args: string[]): Promise<string> {
  const result = await execFileAsync(executable, args, {
    cwd,
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createRepository(root: string): Promise<string> {
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  await run(projectRoot, "git", ["init"]);
  await run(projectRoot, "git", ["config", "user.name", "CycleWarden Test"]);
  await run(projectRoot, "git", ["config", "user.email", "cyclewarden-test@example.invalid"]);
  await writeFile(join(projectRoot, "README.md"), "# Fixture\n", "utf8");
  await run(projectRoot, "git", ["add", "README.md"]);
  await run(projectRoot, "git", ["commit", "-m", "Initial fixture"]);
  return projectRoot;
}

async function createPlannedCycle(store: EvolutionStore, cycleId: string): Promise<EvolutionCycle> {
  let cycle = createCycle({
    cycleId,
    objective: "Implement one bounded verified fixture change",
    autonomy: "A3",
    risk: "R1",
    now: "2026-07-24T00:00:00.000Z",
  });
  await store.create(cycle);

  const advance = async (
    to: EvolutionStage,
    input: Parameters<typeof transitionCycle>[2]
  ): Promise<void> => {
    const next = transitionCycle(cycle, to, input);
    cycle = await store.save(cycle, next);
  };

  await advance("observed", {
    actor: "fixture-inspector",
    reason: "Captured fixture baseline",
    addArtifacts: { baseline: ["fixture:baseline"] },
  });
  await advance("modeled", {
    actor: "fixture-assessor",
    reason: "Modeled fixture repository",
    addArtifacts: { model: ["fixture:model"] },
  });
  await advance("diagnosed", {
    actor: "fixture-researcher",
    reason: "Diagnosed fixture opportunity",
    addArtifacts: { diagnosis: ["fixture:diagnosis"], candidates: ["fixture:candidates"] },
  });
  await advance("researched", {
    actor: "fixture-researcher",
    reason: "Completed fixture research",
    addArtifacts: { research: ["fixture:research"] },
  });
  await advance("decided", {
    actor: "fixture-reviewer",
    reason: "Selected fixture opportunity",
    addArtifacts: { decision: ["fixture:decision"] },
  });

  const handoff: ExecutionHandoff = {
    recordId: `execution-handoff:${cycleId}`,
    cycleId,
    actor: "fixture-researcher",
    createdAt: "2026-07-24T00:00:00.000Z",
    evidenceRefs: ["fixture:research"],
    kind: "execution-handoff",
    experimentId: `experiment:${cycleId}`,
    objective: "Write a bounded fixture result",
    allowedScope: ["docs/**"],
    forbiddenScope: ["secrets", "production"],
    acceptanceCriteria: ["docs/result.md contains ok"],
    verificationPlan: ["read docs/result.md"],
    rollbackPlan: ["delete docs/result.md"],
    parameterDigest: "a".repeat(64),
  };
  await advance("planned", {
    actor: "fixture-researcher",
    reason: "Prepared fixture execution handoff",
    addArtifacts: { plan: ["fixture:plan"], rollback: ["fixture:rollback"] },
    appendResearch: { executionHandoffs: [handoff] },
  });
  return cycle;
}

async function writeManifest(root: string, commandSource: string): Promise<string> {
  const path = join(root, "delivery.json");
  await writeFile(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        adapter: "generic-command",
        expectedParameterDigest: "a".repeat(64),
        command: {
          executable: process.execPath,
          arguments: ["-e", commandSource],
          timeoutMs: 10_000,
          maxOutputBytes: 16_384,
        },
        verification: [
          {
            id: "result-content",
            executable: process.execPath,
            arguments: [
              "-e",
              "const fs=require('node:fs');process.exit(fs.readFileSync('docs/result.md','utf8')==='ok'?0:1)",
            ],
            timeoutMs: 10_000,
            maxOutputBytes: 16_384,
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return path;
}

describe("governed delivery vertical slice", () => {
  it("implements in an isolated branch and accepts only after a separate verifier passes", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-delivery-test-"));
    temporaryRoots.push(root);
    const projectRoot = await createRepository(root);
    const store = new EvolutionStore(join(root, ".cyclewarden"));
    const cycleId = "fixture:delivery-accepted";
    await createPlannedCycle(store, cycleId);
    const manifestPath = await writeManifest(
      root,
      "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')"
    );

    const executed = await executeDelivery({
      store,
      cycleId,
      projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    expect(executed.cycle.stage).toBe("implemented");
    expect(executed.execution.changedFiles).toEqual(["docs/result.md"]);
    expect(executed.execution.scopeViolations).toEqual([]);

    const verified = await verifyDelivery({
      store,
      cycleId,
      projectRoot,
      actor: "fixture-independent-verifier",
    });
    expect(verified.cycle.stage).toBe("verified");
    expect(verified.verification.verdict).toBe("accepted");
    expect(verified.verification.commitSha).toMatch(/^[a-f0-9]{40}$/);
    expect(
      await run(projectRoot, "git", ["show", `${verified.branchName}:docs/result.md`])
    ).toBe("ok");
  });

  it("rejects a command that mutates a file outside the handoff scope", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-delivery-scope-"));
    temporaryRoots.push(root);
    const projectRoot = await createRepository(root);
    const store = new EvolutionStore(join(root, ".cyclewarden"));
    const cycleId = "fixture:delivery-scope";
    await createPlannedCycle(store, cycleId);
    const manifestPath = await writeManifest(
      root,
      "const fs=require('node:fs');fs.mkdirSync('src',{recursive:true});fs.writeFileSync('src/escape.ts','export {}')"
    );

    const executed = await executeDelivery({
      store,
      cycleId,
      projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    expect(executed.cycle.stage).toBe("rejected");
    expect(executed.execution.scopeViolations).toContain("src/escape.ts is outside allowedScope");
  });

  it("does not let the implementer act as the final verifier", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-delivery-reviewer-"));
    temporaryRoots.push(root);
    const projectRoot = await createRepository(root);
    const store = new EvolutionStore(join(root, ".cyclewarden"));
    const cycleId = "fixture:delivery-reviewer";
    await createPlannedCycle(store, cycleId);
    const manifestPath = await writeManifest(
      root,
      "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')"
    );

    const executed = await executeDelivery({
      store,
      cycleId,
      projectRoot,
      manifestPath,
      actor: "same-actor",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    await expect(
      verifyDelivery({ store, cycleId, projectRoot, actor: "same-actor" })
    ).rejects.toThrow(/must differ/);
    expect((await store.load(cycleId)).stage).toBe("implemented");
    expect(await readFile(join(executed.worktreePath, "docs/result.md"), "utf8")).toBe("ok");
  });
});
