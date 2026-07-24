#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const cyclewardenRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(cyclewardenRoot, "packages/evolution-core/dist/cli.js");
const temporary = await mkdtemp(join(tmpdir(), "cyclewarden-external-proof-"));
const projectRoot = join(temporary, "is-plain-obj");
const store = join(temporary, ".cyclewarden");
const cycleId = "is-plain-obj:external-proof-001";
const repository = "https://github.com/sindresorhus/is-plain-obj.git";
const revision = "97f38e8836f86a642cce98fc6ab3058bc36df181";

function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? cyclewardenRoot,
    encoding: "utf8",
    env: process.env,
    timeout: options.timeout ?? 180_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${args.join(" ")} failed:\n${result.stderr || result.stdout || "no output"}`
    );
  }
  return result.stdout;
}

function runCli(args) {
  const output = command(process.execPath, [cli, ...args], { cwd: cyclewardenRoot, timeout: 240_000 });
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`CLI returned invalid JSON (${args.join(" ")}):\n${output}`);
  }
}

try {
  command("git", ["clone", "--filter=blob:none", "--no-checkout", repository, projectRoot]);
  command("git", ["checkout", "--detach", revision], { cwd: projectRoot });
  command(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock"],
    { cwd: projectRoot, timeout: 240_000 }
  );

  runCli([
    "start",
    "--root",
    store,
    "--project-root",
    projectRoot,
    "--id",
    cycleId,
    "--objective",
    "Assess an unrelated real repository before product research",
    "--autonomy",
    "A2",
    "--risk",
    "R1",
  ]);

  const inspected = runCli([
    "inspect",
    cycleId,
    "--root",
    store,
    "--project-root",
    projectRoot,
    "--actor",
    "external-proof",
  ]);
  if (inspected.cycle?.stage !== "observed") {
    throw new Error("external repository inspection did not reach observed");
  }
  if (inspected.snapshot?.git?.commit !== revision) {
    throw new Error(`external repository was not pinned to ${revision}`);
  }
  if (!(inspected.snapshot?.checks ?? []).some((check) => check.name === "test")) {
    throw new Error("external repository test script was not discovered");
  }

  const assessed = runCli([
    "assess",
    cycleId,
    "--root",
    store,
    "--project-root",
    projectRoot,
    "--check",
    "test",
    "--timeout-ms",
    "180000",
    "--actor",
    "external-proof",
  ]);
  if (assessed.cycle?.stage !== "modeled") {
    throw new Error("external repository assessment did not reach modeled");
  }
  if (assessed.checkReport?.summary?.passed !== 1) {
    throw new Error("external repository isolated test did not pass");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(assessed.evidence?.scorecard?.id ?? "")) {
    throw new Error("external repository scorecard is not content-addressed");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        repository,
        revision,
        cycleId,
        stage: assessed.cycle.stage,
        readiness: assessed.scorecard.readiness,
        checkSummary: assessed.checkReport.summary,
        scorecardEvidence: assessed.evidence.scorecard.id,
        unknowns: assessed.scorecard.unknowns,
        nextActions: assessed.scorecard.nextActions,
      },
      null,
      2
    )
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
