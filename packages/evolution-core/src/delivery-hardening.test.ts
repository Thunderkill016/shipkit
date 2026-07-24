import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  executeDelivery,
  loadDeliveryManifest,
  verifyDelivery,
  type DeliveryCommandSpec,
} from "./delivery.js";
import { EvolutionStore } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, EvolutionStage, ExecutionHandoff } from "./types.js";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];
const DIGEST = "a".repeat(64);

async function run(cwd: string, executable: string, args: string[]): Promise<string> {
  const result = await execFileAsync(executable, args, {
    cwd,
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
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

async function createPlannedCycle(store: EvolutionStore, cycleId: string): Promise<void> {
  let cycle: EvolutionCycle = createCycle({
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
    parameterDigest: DIGEST,
  };
  await advance("planned", {
    actor: "fixture-researcher",
    reason: "Prepared fixture execution handoff",
    addArtifacts: { plan: ["fixture:plan"], rollback: ["fixture:rollback"] },
    appendResearch: { executionHandoffs: [handoff] },
  });
}

function verificationCommand(source?: string): DeliveryCommandSpec {
  return {
    id: "result-content",
    executable: process.execPath,
    arguments: [
      "-e",
      source ??
        "const fs=require('node:fs');process.exit(fs.readFileSync('docs/result.md','utf8')==='ok'?0:1)",
    ],
    timeoutMs: 10_000,
    maxOutputBytes: 16_384,
  };
}

async function writeManifest(
  root: string,
  options: {
    commandSource: string;
    digest?: string;
    executable?: string;
    arguments?: string[];
    verificationSource?: string;
  }
): Promise<string> {
  const path = join(root, `delivery-${Math.random().toString(16).slice(2)}.json`);
  await writeFile(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        adapter: "generic-command",
        expectedParameterDigest: options.digest ?? DIGEST,
        command: {
          executable: options.executable ?? process.execPath,
          arguments: options.arguments ?? ["-e", options.commandSource],
          timeoutMs: 10_000,
          maxOutputBytes: 16_384,
        },
        verification: [verificationCommand(options.verificationSource)],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return path;
}

async function setup(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-delivery-hardening-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = await createRepository(root);
  const store = new EvolutionStore(join(root, ".cyclewarden"));
  const cycleId = `fixture:${name}`;
  await createPlannedCycle(store, cycleId);
  return { root, projectRoot, store, cycleId };
}

describe("governed delivery hardening", () => {
  it("rejects a dirty base repository before creating the worktree", async () => {
    const fixture = await setup("dirty-base");
    await writeFile(join(fixture.projectRoot, "README.md"), "dirty\n", "utf8");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
    });
    await expect(
      executeDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        manifestPath,
        actor: "fixture-implementer",
        trustedRepository: true,
      })
    ).rejects.toThrow(/clean repository/);
    expect((await fixture.store.load(fixture.cycleId)).stage).toBe("planned");
  });

  it("rejects a manifest whose digest does not match the persisted handoff", async () => {
    const fixture = await setup("digest-mismatch");
    const manifestPath = await writeManifest(fixture.root, {
      digest: "b".repeat(64),
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
    });
    await expect(
      executeDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        manifestPath,
        actor: "fixture-implementer",
        trustedRepository: true,
      })
    ).rejects.toThrow(/parameter digest/);
    expect((await fixture.store.load(fixture.cycleId)).stage).toBe("planned");
  });

  it("marks a successful command that creates no patch as inconclusive", async () => {
    const fixture = await setup("no-change");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource: "process.stdout.write('no change')",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    expect(executed.execution.status).toBe("inconclusive");
    expect(executed.cycle.stage).toBe("inconclusive");
  });

  it("rejects same-file content drift before independent verification", async () => {
    const fixture = await setup("pre-verify-drift");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    await writeFile(join(executed.worktreePath, "docs/result.md"), "tampered", "utf8");
    const verified = await verifyDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-independent-verifier",
    });
    expect(verified.verification.verdict).toBe("rejected");
    expect(verified.verification.unresolvedRisks).toContain(
      "worktree content changed after implementation and before verification"
    );
    expect(verified.cycle.stage).toBe("rejected");
  });

  it("rejects a verifier command that mutates the patch without changing filenames", async () => {
    const fixture = await setup("verifier-mutates");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
      verificationSource:
        "const fs=require('node:fs');fs.writeFileSync('docs/result.md','changed-by-check')",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    const verified = await verifyDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-independent-verifier",
    });
    expect(verified.verification.verdict).toBe("rejected");
    expect(verified.verification.unresolvedRisks).toContain(
      "verification commands changed the implementation patch content"
    );
  });

  it("rejects command shells in delivery manifests", async () => {
    const fixture = await setup("shell-rejected");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource: "",
      executable: "bash",
      arguments: ["-lc", "printf unsafe"],
    });
    await expect(loadDeliveryManifest(manifestPath)).rejects.toThrow(/may not invoke a command shell/);
  });

  it("rejects a changed symlink that resolves outside the worktree", async () => {
    const fixture = await setup("symlink-escape");
    const scriptPath = join(fixture.root, "create-symlink.mjs");
    await writeFile(
      scriptPath,
      `import { mkdir, symlink } from "node:fs/promises"; await mkdir("docs", { recursive: true }); await symlink(${JSON.stringify(
        join(fixture.root, "outside.txt")
      )}, "docs/result.md");\n`,
      "utf8"
    );
    await writeFile(join(fixture.root, "outside.txt"), "outside", "utf8");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource: "",
      executable: process.execPath,
      arguments: [scriptPath],
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    expect(executed.cycle.stage).toBe("rejected");
    expect(executed.execution.scopeViolations.join(" ")).toMatch(/symlink escapes/);
  });
});
