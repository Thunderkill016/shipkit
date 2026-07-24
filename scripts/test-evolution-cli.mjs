#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "packages/evolution-core/dist/cli.js");
const temporary = await mkdtemp(join(tmpdir(), "cyclewarden-evolution-smoke-"));
const store = join(temporary, ".cyclewarden");
const cycleId = "cyclewarden:ci-dogfood-001";
const reportPath = join(root, "artifacts", "evolution-dogfood-report.json");

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI failed (${args.join(" ")}):\n${result.stderr || result.stdout || "no output"}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`CLI returned invalid JSON (${args.join(" ")}):\n${result.stdout}`);
  }
}

try {
  run(["init", "--root", store, "--project-root", root]);
  const started = run([
    "start",
    "--root",
    store,
    "--project-root",
    root,
    "--id",
    cycleId,
    "--objective",
    "Choose CycleWarden's next evidence-backed product experiment",
    "--autonomy",
    "A2",
    "--risk",
    "R1",
  ]);
  if (started.stage !== "created") throw new Error("cycle did not start at created");

  const inspected = run([
    "inspect",
    cycleId,
    "--root",
    store,
    "--project-root",
    root,
    "--actor",
    "ci-dogfood-inspector",
  ]);
  if (inspected.cycle?.stage !== "observed") {
    throw new Error("inspect did not advance the persisted cycle to observed");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(inspected.evidence?.id ?? "")) {
    throw new Error("inspect did not produce content-addressed evidence");
  }
  const checkNames = new Set((inspected.snapshot?.checks ?? []).map((check) => check.name));
  if (!checkNames.has("test") || !checkNames.has("build")) {
    throw new Error("repository perception did not discover CycleWarden test/build checks");
  }
  if (!(inspected.snapshot?.ci ?? []).includes(".github/workflows/ci.yml")) {
    throw new Error("repository perception did not discover CycleWarden CI");
  }

  const assessed = run([
    "assess",
    cycleId,
    "--root",
    store,
    "--project-root",
    root,
    "--check",
    "test",
    "--timeout-ms",
    "180000",
    "--actor",
    "ci-dogfood-assessor",
  ]);
  if (assessed.cycle?.stage !== "modeled") {
    throw new Error("assessment did not advance the persisted cycle to modeled");
  }
  const checkSummary = assessed.checkReport?.summary;
  if (
    !checkSummary ||
    checkSummary.passed < 1 ||
    checkSummary.failed > 0 ||
    checkSummary.timedOut > 0 ||
    checkSummary.unavailable > 0
  ) {
    throw new Error(
      `one or more isolated CycleWarden test checks did not pass; diagnostic: ${reportPath}`
    );
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(assessed.evidence?.scorecard?.id ?? "")) {
    throw new Error("assessment did not produce a content-addressed scorecard");
  }

  const researched = run([
    "research-repository",
    cycleId,
    "--root",
    store,
    "--project-root",
    root,
    "--check",
    "test",
    "--timeout-ms",
    "180000",
    "--actor",
    "ci-dogfood-researcher",
    "--reviewer",
    "ci-dogfood-independent-reviewer",
  ]);
  if (researched.outcome !== "completed" || researched.cycle?.stage !== "planned") {
    throw new Error("repository research did not produce a reviewed planned cycle");
  }
  if (researched.run?.adapter !== "repository-single-worker") {
    throw new Error("repository research did not persist the single-worker run adapter");
  }
  if (researched.evaluation?.verdict !== "pass") {
    throw new Error("independent repository research review did not pass");
  }
  if ((researched.records?.opportunities ?? []).length < 3) {
    throw new Error("repository research did not preserve at least three opportunities");
  }
  if ((researched.records?.claims ?? []).some((claim) => claim.claimType === "user-problem")) {
    throw new Error("repository-only research produced an unsupported user-problem claim");
  }
  if (!/^[a-f0-9]{64}$/.test(researched.executionHandoff?.parameterDigest ?? "")) {
    throw new Error("repository research did not create a parameter-bound execution handoff");
  }

  const resumed = run(["resume", cycleId, "--root", store]);
  if (resumed.cycle?.stage !== "planned") throw new Error("resume lost planned research state");
  if (resumed.cycle?.research?.runs?.at(-1)?.outcome !== "completed") {
    throw new Error("resume lost the durable research run");
  }
  if (resumed.cycle?.research?.evaluations?.at(-1)?.verdict !== "pass") {
    throw new Error("resume lost the durable research evaluation");
  }

  const status = run(["status", "--root", store]);
  if (status.cycles?.[0]?.cycleId !== cycleId) throw new Error("status did not list dogfood cycle");

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        cycleId,
        stage: resumed.cycle?.stage,
        snapshotEvidence: inspected.evidence?.id,
        assessmentEvidence: assessed.evidence,
        researchEvidence: researched.evidence,
        scorecard: researched.scorecard,
        checkReport: researched.checkReport,
        run: researched.run,
        evaluation: researched.evaluation,
        selectedDecision: researched.records?.decision,
        executionHandoff: researched.executionHandoff,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        cycleId,
        stage: resumed.cycle.stage,
        snapshotEvidence: inspected.evidence.id,
        scorecardEvidence: researched.evidence.scorecard.id,
        readiness: researched.scorecard.readiness,
        checkSummary: researched.checkReport.summary,
        researchOutcome: researched.run.outcome,
        reviewVerdict: researched.evaluation.verdict,
        opportunities: researched.records.opportunities.length,
        filesObserved: inspected.snapshot.inventory.filesObserved,
        checks: [...checkNames].sort(),
      },
      null,
      2
    )
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
