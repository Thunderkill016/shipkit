#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evolutionCli = join(repositoryRoot, "packages", "evolution-core", "dist", "cli.js");
const candidateCli = join(
  repositoryRoot,
  "packages",
  "evolution-core",
  "dist",
  "candidate-cli.js"
);
const manifestPath = join(
  repositoryRoot,
  "packages",
  "evolution-core",
  "src",
  "fixtures",
  "shipkit-next-workstream.candidates.json"
);
const capabilitiesPath = join(repositoryRoot, "docs", "CAPABILITIES.json");
const temporaryRoot = await mkdtemp(join(tmpdir(), "shipkit-candidate-proof-"));
const storeRoot = join(temporaryRoot, ".shipkit");
const cycleId = "shipkit:candidate-proof-001";
const reportPath = join(repositoryRoot, "artifacts", "candidate-research-proof.json");

function run(cli, args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `candidate proof command failed (${args.join(" ")}):\n${result.stderr || result.stdout || "no output"}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`candidate proof returned invalid JSON (${args.join(" ")}):\n${result.stdout}`);
  }
}

try {
  run(evolutionCli, ["init", "--root", storeRoot, "--project-root", repositoryRoot]);
  const created = run(evolutionCli, [
    "start",
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--id",
    cycleId,
    "--objective",
    "Choose Shipkit's next named workstream among #15, #13, #12 and #17",
    "--autonomy",
    "A2",
    "--risk",
    "R1",
  ]);
  if (created.stage !== "created") throw new Error("candidate proof did not start at created");

  const inspected = run(evolutionCli, [
    "inspect",
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--actor",
    "candidate-proof-inspector",
  ]);
  if (inspected.cycle?.stage !== "observed") throw new Error("candidate proof inspect failed");

  const assessed = run(evolutionCli, [
    "assess",
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--check",
    "test",
    "--timeout-ms",
    "240000",
    "--actor",
    "candidate-proof-assessor",
  ]);
  if (assessed.cycle?.stage !== "modeled") throw new Error("candidate proof assessment failed");

  const candidate = run(candidateCli, [
    cycleId,
    "--root",
    storeRoot,
    "--project-root",
    repositoryRoot,
    "--manifest",
    manifestPath,
    "--capabilities",
    capabilitiesPath,
    "--actor",
    "candidate-proof-researcher",
    "--reviewer",
    "candidate-proof-independent-reviewer",
  ]);

  if (candidate.outcome !== "completed" || candidate.cycle?.stage !== "planned") {
    throw new Error(`candidate proof did not complete: ${candidate.reason ?? "unknown"}`);
  }
  if (candidate.run?.adapter !== "candidate-manifest") {
    throw new Error("candidate proof did not persist candidate-manifest adapter");
  }
  if (candidate.evaluation?.verdict !== "pass") {
    throw new Error("candidate proof independent review did not pass");
  }

  const opportunities = candidate.records?.opportunities ?? [];
  if (opportunities.length !== 4) throw new Error("candidate proof did not preserve four alternatives");
  const selected = opportunities.find(
    (opportunity) => opportunity.recordId === candidate.records?.decision?.selectedOpportunityId
  );
  if (selected?.title !== "#13: Minimal candidate-grounded research") {
    throw new Error(`candidate proof selected unexpected alternative: ${selected?.title ?? "missing"}`);
  }
  if ((candidate.records?.decision?.rejectedOpportunityIds ?? []).length !== 3) {
    throw new Error("candidate proof did not preserve three rejected alternatives");
  }

  const trustedLocalClaim = (candidate.records?.claims ?? []).find((claim) =>
    claim.statement.includes("selected path is trusted-local")
  );
  const dockerClaim = (candidate.records?.claims ?? []).find((claim) =>
    claim.statement.includes("separate Docker baseline")
  );
  if (!trustedLocalClaim || !dockerClaim) {
    throw new Error("candidate proof did not distinguish trusted-local from Docker capability");
  }

  const guardrails = candidate.records?.experiment?.guardrails ?? [];
  const protectedParameters = guardrails.find(
    (item) => item.includes('"participants":6') && item.includes('"repositories":6')
  );
  if (!protectedParameters || !protectedParameters.includes('"durationDays":14')) {
    throw new Error("candidate proof did not preserve fixed #14 participant/repository/duration parameters");
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const resumed = run(evolutionCli, ["resume", cycleId, "--root", storeRoot]);
  if (resumed.cycle?.stage !== "planned") throw new Error("candidate proof replay lost planned state");
  if (resumed.cycle?.research?.runs?.at(-1)?.adapter !== "candidate-manifest") {
    throw new Error("candidate proof replay lost candidate run");
  }

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        cycleId,
        selected: selected.title,
        rejected: opportunities.filter((item) => item.recordId !== selected.recordId).map((item) => item.title),
        scores: candidate.scores,
        run: candidate.run,
        evaluation: candidate.evaluation,
        executionBackend: manifest.executionBackend,
        protectedExperiment: manifest.protectedExperiment,
        trustedLocalClaim: trustedLocalClaim.statement,
        dockerClaim: dockerClaim.statement,
        parameterDigest: candidate.executionHandoff?.parameterDigest,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        cycleId,
        stage: resumed.cycle.stage,
        selected: selected.title,
        rejectedAlternatives: 3,
        reviewVerdict: candidate.evaluation.verdict,
        protectedParticipants: manifest.protectedExperiment.parameters.participants,
        reportPath,
      },
      null,
      2
    )}\n`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
