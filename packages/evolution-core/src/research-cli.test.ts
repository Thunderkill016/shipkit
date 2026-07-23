import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runEvolutionCli } from "./cli.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function collector() {
  let stdout = "";
  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: () => undefined,
    },
    json: () => JSON.parse(stdout),
  };
}

const bundle = {
  brief: { decisionQuestion: "Which integrated workflow should Shipkit implement next?" },
  plan: {
    questions: ["Which workflow removes the largest coordination gap?"],
    sourceStrategy: ["Repository evidence"],
    stopConditions: ["Three defensible opportunities exist"],
  },
  queries: [
    {
      query: "Shipkit disconnected workflow evidence",
      rationale: "Find gaps between existing modules",
      tool: "repository-search",
    },
  ],
  sources: [
    {
      canonicalId: "repo:roadmap",
      title: "Shipkit integrated roadmap",
      publisher: "Shipkit",
      sourceClass: "repository",
      authority: 1,
      directness: 1,
      freshness: 1,
      applicability: 1,
      independence: 0.2,
      evidenceRefs: ["evidence:roadmap"],
    },
  ],
  claims: [
    {
      statement: "Research output currently lacks a typed execution handoff.",
      claimType: "limitation",
      confidence: 0.95,
      uncertainty: "The workspace surface is not part of this CLI test.",
      supportingSourceIndexes: [0],
    },
  ],
  opportunities: [
    {
      title: "Typed research handoff",
      problem: "Research decisions cannot yet flow into execution.",
      expectedOutcome: "One durable research-to-plan cycle.",
      evidenceClaimIndexes: [0],
      estimatedCost: "medium",
      risk: "low",
      uncertainty: "Agent execution remains unavailable.",
      learningValue: "Validates the shared lifecycle contract.",
      smallestExperiment: "Persist one execution handoff.",
    },
    {
      title: "Workspace research view",
      problem: "Users must inspect raw cycle JSON.",
      expectedOutcome: "Research becomes reviewable in the product UI.",
      evidenceClaimIndexes: [0],
      estimatedCost: "medium",
      risk: "low",
      uncertainty: "UI requirements need user validation.",
      learningValue: "Tests whether one workspace improves comprehension.",
      smallestExperiment: "Render read-only research records.",
    },
    {
      title: "Sandbox adapter contract",
      problem: "Execution cannot safely consume a selected experiment.",
      expectedOutcome: "Fail-closed capability negotiation.",
      evidenceClaimIndexes: [0],
      estimatedCost: "large",
      risk: "medium",
      uncertainty: "Backend choice is unresolved.",
      learningValue: "Defines the execution safety boundary.",
      smallestExperiment: "Implement a no-op capability backend.",
    },
  ],
  decision: {
    selectedOpportunityIndex: 0,
    rationale: "It creates the smallest integration point required by every later execution client.",
  },
  experiment: {
    hypothesis: "A typed handoff can connect research and execution without code mutation.",
    method: "Create and reload one planned cycle.",
    successCriteria: ["The handoff survives journal replay."],
    guardrails: ["No code is modified."],
    rollbackPlan: ["Discard the planned cycle."],
  },
  handoff: {
    allowedScope: ["packages/evolution-core"],
    forbiddenScope: ["production", "deploy", "secrets"],
    acceptanceCriteria: ["The planned cycle contains a parameter-bound handoff."],
    verificationPlan: ["Unit test and replay through research-show."],
    rollbackPlan: ["Do not enter executing stage."],
  },
};

describe("prepare-handoff CLI", () => {
  it("persists research records and reloads the execution handoff", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-research-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".shipkit");
    const bundlePath = join(root, "research.json");
    const cycleId = "shipkit:research-cli-001";
    await writeFile(bundlePath, JSON.stringify(bundle), "utf8");

    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--id",
        cycleId,
        "--objective",
        "Connect research decisions to governed execution",
      ],
      collector().io
    );
    await runEvolutionCli(
      [
        "advance",
        cycleId,
        "--root",
        storeRoot,
        "--to",
        "observed",
        "--actor",
        "test",
        "--reason",
        "baseline",
        "--artifact",
        "baseline=evidence:baseline",
      ],
      collector().io
    );
    await runEvolutionCli(
      [
        "advance",
        cycleId,
        "--root",
        storeRoot,
        "--to",
        "modeled",
        "--actor",
        "test",
        "--reason",
        "model",
        "--artifact",
        "model=evidence:model",
      ],
      collector().io
    );

    const prepared = collector();
    await expect(
      runEvolutionCli(
        [
          "prepare-handoff",
          cycleId,
          "--root",
          storeRoot,
          "--project-root",
          root,
          "--bundle",
          bundlePath,
          "--actor",
          "research-test",
        ],
        prepared.io
      )
    ).resolves.toBe(0);

    expect(prepared.json().cycle.stage).toBe("planned");
    expect(prepared.json().cycle.research.opportunities).toHaveLength(3);
    expect(prepared.json().executionHandoff.parameterDigest).toMatch(/^[a-f0-9]{64}$/);

    const shown = collector();
    await runEvolutionCli(["research-show", cycleId, "--root", storeRoot], shown.io);
    expect(shown.json()).toMatchObject({ cycleId, stage: "planned" });
    expect(shown.json().research.executionHandoffs).toHaveLength(1);
  });
});
