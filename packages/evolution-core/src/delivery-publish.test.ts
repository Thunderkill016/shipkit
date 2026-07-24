import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { executeDelivery, showDelivery, verifyDelivery } from "./delivery.js";
import { publishDelivery } from "./delivery-publish.js";
import { EvolutionStore } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, ExecutionHandoff, EvolutionStage } from "./types.js";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];
const originalPath = process.env.PATH;

async function run(cwd: string, executable: string, args: string[]): Promise<string> {
  const result = await execFileAsync(executable, args, {
    cwd,
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
}

afterEach(async () => {
  process.env.PATH = originalPath;
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createPlannedCycle(store: EvolutionStore, cycleId: string): Promise<void> {
  let cycle: EvolutionCycle = createCycle({
    cycleId,
    objective: "Publish one independently verified fixture change",
    autonomy: "A3",
    risk: "R1",
    now: "2026-07-24T00:00:00.000Z",
  });
  await store.create(cycle);
  const advance = async (to: EvolutionStage, input: Parameters<typeof transitionCycle>[2]) => {
    const next = transitionCycle(cycle, to, input);
    cycle = await store.save(cycle, next);
  };
  await advance("observed", {
    actor: "fixture",
    reason: "observed",
    addArtifacts: { baseline: ["fixture:baseline"] },
  });
  await advance("modeled", {
    actor: "fixture",
    reason: "modeled",
    addArtifacts: { model: ["fixture:model"] },
  });
  await advance("diagnosed", {
    actor: "fixture",
    reason: "diagnosed",
    addArtifacts: { diagnosis: ["fixture:diagnosis"], candidates: ["fixture:candidates"] },
  });
  await advance("researched", {
    actor: "fixture",
    reason: "researched",
    addArtifacts: { research: ["fixture:research"] },
  });
  await advance("decided", {
    actor: "fixture",
    reason: "decided",
    addArtifacts: { decision: ["fixture:decision"] },
  });
  const handoff: ExecutionHandoff = {
    recordId: `execution-handoff:${cycleId}`,
    cycleId,
    actor: "fixture",
    createdAt: "2026-07-24T00:00:00.000Z",
    evidenceRefs: ["fixture:research"],
    kind: "execution-handoff",
    experimentId: `experiment:${cycleId}`,
    objective: "Write and publish a fixture result",
    allowedScope: ["docs/**"],
    forbiddenScope: ["production", "secrets"],
    acceptanceCriteria: ["docs/result.md contains ok"],
    verificationPlan: ["read docs/result.md"],
    rollbackPlan: ["delete docs/result.md"],
    parameterDigest: "a".repeat(64),
  };
  await advance("planned", {
    actor: "fixture",
    reason: "planned",
    addArtifacts: { plan: ["fixture:plan"], rollback: ["fixture:rollback"] },
    appendResearch: { executionHandoffs: [handoff] },
  });
}

async function setup(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-publish-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = join(root, "project");
  const remoteRoot = join(root, "remote.git");
  await mkdir(projectRoot, { recursive: true });
  await run(projectRoot, "git", ["init"]);
  await run(projectRoot, "git", ["config", "user.name", "CycleWarden Test"]);
  await run(projectRoot, "git", ["config", "user.email", "cyclewarden-test@example.invalid"]);
  await writeFile(join(projectRoot, "README.md"), "# Fixture\n", "utf8");
  await run(projectRoot, "git", ["add", "README.md"]);
  await run(projectRoot, "git", ["commit", "-m", "Initial fixture"]);
  await run(root, "git", ["init", "--bare", remoteRoot]);
  await run(projectRoot, "git", [
    "remote",
    "add",
    "origin",
    "https://github.com/example/cyclewarden-fixture.git",
  ]);
  await run(projectRoot, "git", ["config", "remote.origin.pushurl", remoteRoot]);

  const store = new EvolutionStore(join(root, ".cyclewarden"));
  const cycleId = `fixture:publish-${name}`;
  await createPlannedCycle(store, cycleId);
  const manifestPath = join(root, "delivery.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        adapter: "generic-command",
        expectedParameterDigest: "a".repeat(64),
        command: {
          executable: process.execPath,
          arguments: [
            "-e",
            "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
          ],
        },
        verification: [
          {
            id: "result-content",
            executable: process.execPath,
            arguments: [
              "-e",
              "const fs=require('node:fs');process.exit(fs.readFileSync('docs/result.md','utf8')==='ok'?0:1)",
            ],
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
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
  const verified = await verifyDelivery({
    store,
    cycleId,
    projectRoot,
    actor: "fixture-independent-verifier",
  });
  return { root, projectRoot, remoteRoot, store, cycleId, verified };
}

async function createFakeGh(root: string, mode: "success" | "auth-fail") {
  const binRoot = join(root, "fake-bin");
  const logPath = join(root, "gh-calls.jsonl");
  await mkdir(binRoot, { recursive: true });
  const path = join(binRoot, "gh");
  await writeFile(
    path,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n");
if (args[0] === "--version") { console.log("gh version fixture"); process.exit(0); }
if (args[0] === "auth" && args[1] === "status") { process.exit(${mode === "auth-fail" ? 1 : 0}); }
if (args[0] === "pr" && args[1] === "create") { console.log("https://github.com/example/cyclewarden-fixture/pull/42"); process.exit(0); }
if (args[0] === "pr" && args[1] === "view") {
  console.log(JSON.stringify({ number: 42, url: "https://github.com/example/cyclewarden-fixture/pull/42", isDraft: true, state: "OPEN", headRefName: args[2], baseRefName: "main" }));
  process.exit(0);
}
process.exit(2);
`,
    "utf8"
  );
  await chmod(path, 0o755);
  process.env.PATH = `${binRoot}${delimiter}${originalPath ?? ""}`;
  return { logPath };
}

async function remoteHead(projectRoot: string, branchName: string): Promise<string> {
  return await run(projectRoot, "git", [
    "ls-remote",
    "--heads",
    "origin",
    `refs/heads/${branchName}`,
  ]);
}

describe("verified draft PR publication", () => {
  it("non-force pushes the exact verified commit and records an open draft PR", async () => {
    const fixture = await setup("success");
    const fake = await createFakeGh(fixture.root, "success");
    const result = await publishDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-publisher",
      baseBranch: "main",
      confirmPushAndDraftPr: true,
    });
    expect(result.publication.outcome).toBe("published");
    expect(result.publication.pullRequest).toMatchObject({
      status: "created",
      number: 42,
      isDraft: true,
    });
    expect(await remoteHead(fixture.projectRoot, fixture.verified.branchName)).toContain(
      fixture.verified.verification.commitSha!
    );
    expect((await showDelivery(fixture.store, fixture.cycleId)).publication).toMatchObject({
      outcome: "published",
    });
    const calls = (await readFile(fake.logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(calls).toContainEqual(expect.arrayContaining(["pr", "create", "--draft"]));
    expect(calls.flat()).not.toContain("merge");
    await expect(
      publishDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-publisher",
        baseBranch: "main",
        confirmPushAndDraftPr: true,
      })
    ).rejects.toThrow(/already has a recorded publication/);
  });

  it("requires explicit publication confirmation before any remote mutation", async () => {
    const fixture = await setup("confirmation");
    await expect(
      publishDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-publisher",
        baseBranch: "main",
        confirmPushAndDraftPr: false,
      })
    ).rejects.toThrow(/explicit --confirm-push-and-draft-pr/);
    expect(await remoteHead(fixture.projectRoot, fixture.verified.branchName)).toBe("");
  });

  it("fails authentication before pushing the verified branch", async () => {
    const fixture = await setup("auth-fail");
    await createFakeGh(fixture.root, "auth-fail");
    await expect(
      publishDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-publisher",
        baseBranch: "main",
        confirmPushAndDraftPr: true,
      })
    ).rejects.toThrow(/GitHub CLI failed for gh auth status/);
    expect(await remoteHead(fixture.projectRoot, fixture.verified.branchName)).toBe("");
  });

  it("fails when gh is unavailable before pushing the verified branch", async () => {
    const fixture = await setup("gh-missing");
    const shimRoot = join(fixture.root, "git-only-bin");
    await mkdir(shimRoot, { recursive: true });
    const gitPath = await run(fixture.root, "which", ["git"]);
    await symlink(gitPath, join(shimRoot, "git"));
    process.env.PATH = shimRoot;
    await expect(
      publishDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-publisher",
        baseBranch: "main",
        confirmPushAndDraftPr: true,
      })
    ).rejects.toThrow(/GitHub CLI failed for gh --version/);
    process.env.PATH = originalPath;
    expect(await remoteHead(fixture.projectRoot, fixture.verified.branchName)).toBe("");
  });
});
