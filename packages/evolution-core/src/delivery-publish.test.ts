import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { executeDelivery, verifyDelivery } from "./delivery.js";
import { publishDelivery, showDeliveryPublication } from "./delivery-publish.js";
import { EvolutionStore } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, EvolutionStage, ExecutionHandoff } from "./types.js";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];
const DIGEST = "a".repeat(64);
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
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function createRepository(root: string): Promise<{ projectRoot: string; remoteRoot: string }> {
  const projectRoot = join(root, "project");
  const remoteRoot = join(root, "remote.git");
  await mkdir(projectRoot, { recursive: true });
  await run(projectRoot, "git", ["init", "-b", "main"]);
  await run(projectRoot, "git", ["config", "user.name", "CycleWarden Test"]);
  await run(projectRoot, "git", ["config", "user.email", "cyclewarden-test@example.invalid"]);
  await writeFile(join(projectRoot, "README.md"), "# Fixture\n", "utf8");
  await run(projectRoot, "git", ["add", "README.md"]);
  await run(projectRoot, "git", ["commit", "-m", "Initial fixture"]);
  await run(root, "git", ["init", "--bare", remoteRoot]);
  await run(projectRoot, "git", ["remote", "add", "origin", remoteRoot]);
  await run(projectRoot, "git", ["push", "origin", "main"]);
  return { projectRoot, remoteRoot };
}

async function createPlannedCycle(store: EvolutionStore, cycleId: string): Promise<void> {
  let cycle: EvolutionCycle = createCycle({
    cycleId,
    objective: "Publish one independently verified fixture change",
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
    objective: "Write and publish a bounded fixture result",
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

async function writeManifest(root: string): Promise<string> {
  const path = join(root, "delivery.json");
  await writeFile(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        adapter: "generic-command",
        expectedParameterDigest: DIGEST,
        command: {
          executable: process.execPath,
          arguments: [
            "-e",
            "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
          ],
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

async function createVerifiedFixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-delivery-publish-${name}-`));
  temporaryRoots.push(root);
  const { projectRoot, remoteRoot } = await createRepository(root);
  const store = new EvolutionStore(join(root, ".cyclewarden"));
  const cycleId = `fixture:${name}`;
  await createPlannedCycle(store, cycleId);
  const executed = await executeDelivery({
    store,
    cycleId,
    projectRoot,
    manifestPath: await writeManifest(root),
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

async function installFakeGh(
  root: string,
  options: { authenticationFails?: boolean } = {}
): Promise<{ logPath: string }> {
  const bin = join(root, "fake-bin");
  const logPath = join(root, "gh-calls.jsonl");
  const statePath = join(root, "gh-pr.json");
  await mkdir(bin, { recursive: true });
  const scriptPath = join(bin, process.platform === "win32" ? "gh.exe" : "gh");
  const script = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const logPath = ${JSON.stringify(logPath)};
const statePath = ${JSON.stringify(statePath)};
fs.appendFileSync(logPath, JSON.stringify(args) + "\\n");
const value = (name) => { const index = args.indexOf(name); return index === -1 ? null : args[index + 1]; };
if (args[0] === "--version") { process.stdout.write("gh version 2.99.0\\n"); process.exit(0); }
if (args[0] === "auth" && args[1] === "status") { process.exit(${options.authenticationFails ? 1 : 0}); }
if (args[0] === "repo" && args[1] === "view") { process.stdout.write("main\\n"); process.exit(0); }
if (args[0] === "pr" && args[1] === "list") {
  process.stdout.write(fs.existsSync(statePath) ? "[" + fs.readFileSync(statePath, "utf8") + "]" : "[]");
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "create") {
  const state = { url: "https://github.com/example/cyclewarden/pull/1", isDraft: true, state: "OPEN", headRefName: value("--head"), baseRefName: value("--base"), number: 1 };
  fs.writeFileSync(statePath, JSON.stringify(state));
  process.stdout.write(state.url + "\\n");
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "view") { process.stdout.write(fs.readFileSync(statePath, "utf8")); process.exit(0); }
process.stderr.write("unsupported fake gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;
  await writeFile(scriptPath, script, "utf8");
  await chmod(scriptPath, 0o755);
  process.env.PATH = `${bin}${delimiter}${originalPath ?? ""}`;
  return { logPath };
}

describe.sequential("verified draft PR publication", () => {
  it("pushes only the verified commit and opens one idempotent draft PR", async () => {
    const fixture = await createVerifiedFixture("published");
    const fakeGh = await installFakeGh(fixture.root);

    const published = await publishDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-publisher",
      draftPr: true,
      hostname: "github.com",
      title: "Publish verified fixture",
      body: "Review the independently verified fixture change.",
    });

    expect(published.publication.status).toBe("published");
    expect(published.publication.draftPrUrl).toBe("https://github.com/example/cyclewarden/pull/1");
    expect(published.publication.steps).toEqual({
      ghAvailable: "passed",
      ghAuthenticated: "passed",
      push: "passed",
      draftPr: "passed",
    });
    expect(
      await run(fixture.root, "git", [
        `--git-dir=${fixture.remoteRoot}`,
        "rev-parse",
        `refs/heads/${fixture.verified.branchName}`,
      ])
    ).toBe(fixture.verified.verification.commitSha);
    expect((await fixture.store.load(fixture.cycleId)).stage).toBe("verified");
    expect((await showDeliveryPublication(fixture.store, fixture.cycleId)).publication?.status).toBe(
      "published"
    );

    const replay = await publishDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-publisher-replay",
      draftPr: true,
      hostname: "github.com",
    });
    expect(replay.publication.recordId).toBe(published.publication.recordId);
    const calls = (await readFile(fakeGh.logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    expect(calls.filter((args) => args[0] === "pr" && args[1] === "create")).toHaveLength(1);
    expect(calls.some((args) => args.includes("merge"))).toBe(false);
  });

  it("does not push without the explicit draft PR opt-in", async () => {
    const fixture = await createVerifiedFixture("no-opt-in");
    await expect(
      publishDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-publisher",
        draftPr: false,
        hostname: "github.com",
      })
    ).rejects.toThrow(/explicit --draft-pr opt-in/);
    await expect(
      run(fixture.root, "git", [
        `--git-dir=${fixture.remoteRoot}`,
        "rev-parse",
        `refs/heads/${fixture.verified.branchName}`,
      ])
    ).rejects.toThrow();
  });

  it("records an inconclusive result before push when GitHub authentication is unavailable", async () => {
    const fixture = await createVerifiedFixture("auth-unavailable");
    await installFakeGh(fixture.root, { authenticationFails: true });

    const result = await publishDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-publisher",
      draftPr: true,
      hostname: "github.com",
    });

    expect(result.publication.status).toBe("inconclusive");
    expect(result.publication.steps.push).toBe("not-run");
    expect(result.publication.draftPrUrl).toBeNull();
    await expect(
      run(fixture.root, "git", [
        `--git-dir=${fixture.remoteRoot}`,
        "rev-parse",
        `refs/heads/${fixture.verified.branchName}`,
      ])
    ).rejects.toThrow();
  });
});
