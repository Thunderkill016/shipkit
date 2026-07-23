#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "packages/evolution-core/dist/cli.js");
const temporary = await mkdtemp(join(tmpdir(), "shipkit-evolution-smoke-"));
const store = join(temporary, ".shipkit");
const cycleId = "shipkit:ci-dogfood-001";

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
    "Inspect and assess Shipkit for the next product evolution cycle",
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
    "ci-dogfood",
  ]);
  if (inspected.cycle?.stage !== "observed") {
    throw new Error("inspect did not advance the persisted cycle to observed");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(inspected.evidence?.id ?? "")) {
    throw new Error("inspect did not produce content-addressed evidence");
  }
  const checkNames = new Set((inspected.snapshot?.checks ?? []).map((check) => check.name));
  if (!checkNames.has("test") || !checkNames.has("build")) {
    throw new Error("repository perception did not discover Shipkit test/build checks");
  }
  if (!(inspected.snapshot?.ci ?? []).includes(".github/workflows/ci.yml")) {
    throw new Error("repository perception did not discover Shipkit CI");
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
    "ci-dogfood",
  ]);
  if (assessed.cycle?.stage !== "modeled") {
    throw new Error("assessment did not advance the persisted cycle to modeled");
  }
  if (assessed.checkReport?.summary?.passed !== 1) {
    throw new Error("isolated Shipkit test check did not pass");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(assessed.evidence?.scorecard?.id ?? "")) {
    throw new Error("assessment did not produce a content-addressed scorecard");
  }

  const resumed = run(["resume", cycleId, "--root", store]);
  if (resumed.cycle?.stage !== "modeled") throw new Error("resume lost modeled cycle state");

  const status = run(["status", "--root", store]);
  if (status.cycles?.[0]?.cycleId !== cycleId) throw new Error("status did not list dogfood cycle");

  console.log(
    JSON.stringify(
      {
        ok: true,
        cycleId,
        stage: resumed.cycle.stage,
        snapshotEvidence: inspected.evidence.id,
        scorecardEvidence: assessed.evidence.scorecard.id,
        readiness: assessed.scorecard.readiness,
        checkSummary: assessed.checkReport.summary,
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
