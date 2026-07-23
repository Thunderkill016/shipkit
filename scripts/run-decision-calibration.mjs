#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repositoryRoot, "packages", "evolution-core", "dist", "cli.js");
const temporaryRoot = await mkdtemp(join(tmpdir(), "shipkit-decision-calibration-"));
const storeRoot = join(temporaryRoot, ".shipkit");
const cycleId = "shipkit:next-workstream-calibration-001";
const reportPath = join(repositoryRoot, "artifacts", "decision-calibration-report.json");
const objective =
  "Choose which Shipkit workstream should be prioritized for the next 4 to 6 weeks among standalone core, minimal search discovery, remaining sandbox hardening, and governed agent execution";

const preAuditDecision = {
  selected: "#15 standalone core",
  sequence: [
    "#15 standalone core",
    "minimal #13 reproducible search discovery",
    "fixed #14 external decision-value pilot",
    "#17 thin governed execution only after pilot success",
  ],
  constraints: [
    "Continue only exposure-blocking #12 work for the local pilot",
    "Do not count internal calibration as external product validation",
  ],
  source: "GitHub issue #26 pre-audit comment 5058383694",
};

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Calibration CLI failed (${args.join(" ")}):\n${result.stderr || result.stdout || "no output"}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Calibration CLI returned invalid JSON (${args.join(" ")}):\n${result.stdout}`);
  }
}

try {
  run(["init", "--root", storeRoot, "--project-root", repositoryRoot]);
  const started = run([
    "start",
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--id",
    cycleId,
    "--objective",
    objective,
    "--autonomy",
    "A2",
    "--risk",
    "R1",
  ]);
  const inspected = run([
    "inspect",
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--actor",
    "calibration-inspector",
  ]);
  const assessed = run([
    "assess",
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--check",
    "test",
    "--timeout-ms",
    "180000",
    "--actor",
    "calibration-assessor",
  ]);
  const researched = run([
    "research-repository",
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--check",
    "test",
    "--timeout-ms",
    "180000",
    "--actor",
    "calibration-researcher",
    "--reviewer",
    "calibration-independent-reviewer",
  ]);
  const resumed = run(["resume", cycleId, "--root", storeRoot]);

  if (started.stage !== "created") throw new Error("calibration did not start at created");
  if (inspected.cycle?.stage !== "observed") throw new Error("calibration inspect failed");
  if (assessed.cycle?.stage !== "modeled") throw new Error("calibration assessment failed");
  if (researched.outcome !== "completed" || researched.cycle?.stage !== "planned") {
    throw new Error("calibration research did not produce a reviewed planned cycle");
  }
  if (researched.evaluation?.verdict !== "pass") {
    throw new Error("calibration independent review did not pass");
  }
  if ((researched.records?.opportunities ?? []).length < 3) {
    throw new Error("calibration did not retain at least three opportunities");
  }

  const report = {
    schemaVersion: 1,
    calibrationType: "internal-not-product-validation",
    cycleId,
    objective,
    preAuditDecision,
    generatedAt: new Date().toISOString(),
    repository: {
      projectName: inspected.snapshot?.projectName,
      commit: inspected.snapshot?.git?.commit,
      dirty: inspected.snapshot?.git?.dirty,
      filesObserved: inspected.snapshot?.inventory?.filesObserved,
      discoveredChecks: inspected.snapshot?.checks,
      productSignals: inspected.snapshot?.productSignals,
      trustBoundaries: inspected.snapshot?.trustBoundaries,
    },
    assessment: {
      scorecard: assessed.scorecard,
      checkSummary: assessed.checkReport?.summary,
      evidence: assessed.evidence,
    },
    research: {
      run: researched.run,
      evaluation: researched.evaluation,
      brief: researched.records?.brief,
      plan: researched.records?.plan,
      queries: researched.records?.queries,
      sources: researched.records?.sources,
      claims: researched.records?.claims,
      contradictions: researched.records?.contradictions,
      opportunities: researched.records?.opportunities,
      decision: researched.records?.decision,
      experiment: researched.records?.experiment,
      executionHandoff: researched.executionHandoff,
      evidence: researched.evidence,
    },
    durableReplay: {
      stage: resumed.cycle?.stage,
      lastRun: resumed.cycle?.research?.runs?.at(-1),
      lastEvaluation: resumed.cycle?.research?.evaluations?.at(-1),
    },
    interpretationRequired: [
      "Compare the selected opportunity with the pre-audit sequence without changing the baseline.",
      "Record whether the output changed, confirmed, prevented, or failed to help the decision.",
      "Treat missing issue-level or external evidence as a capability gap, not permission to expand scope during this run.",
    ],
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        reportPath,
        cycleId,
        stage: resumed.cycle?.stage,
        reviewVerdict: researched.evaluation?.verdict,
        selectedOpportunityIndex: researched.records?.decision?.selectedOpportunityIndex,
        opportunities: researched.records?.opportunities?.map((item) => item.title),
        coverageGaps: researched.run?.coverage?.gaps,
      },
      null,
      2
    )}\n`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
