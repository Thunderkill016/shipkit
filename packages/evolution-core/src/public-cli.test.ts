import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EvolutionStore,
  createCycle,
  runPublicResearchCli,
  transitionCycle,
  type PublicFetch,
} from "./index.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function collector() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: (message: string) => {
        stderr += message;
      },
    },
    output: () => ({ stdout, stderr }),
  };
}

function manifest() {
  const claim = (statement: string, quote: string, claimType = "fact") => ({
    statement,
    claimType,
    confidence: 0.9,
    uncertainty: "The bounded manifest may omit other sources.",
    supportingCitations: [{ sourceIndex: 0, quote }],
    contradictingCitations: [],
    expiresAt: null,
  });
  return {
    brief: {
      decisionQuestion: "Which citation-safety improvement should the product implement next?",
      owner: "public-researcher",
      deadline: null,
      assumptions: [],
      constraints: ["Public HTTP sources only"],
      evidenceThreshold: "Exact quote spans are required.",
      protectedOutcomes: ["No private network access"],
    },
    plan: {
      questions: ["Can source text be captured safely?", "Can exact citations be verified?"],
      sourceStrategy: ["Official documentation"],
      budget: { maxQueries: 2, maxSources: 2, maxMinutes: 15, maxCostUsd: 0 },
      stopConditions: ["Every claim has a verified exact quote."],
    },
    sources: [
      {
        url: "https://docs.example/public-research",
        title: "Public research guidance",
        publisher: "Example Docs",
        sourceClass: "official-documentation",
        version: "1",
        license: null,
        authority: 1,
        directness: 1,
        freshness: 1,
        applicability: 1,
        independence: 0.6,
        conflictOfInterest: "Publisher documents its own guidance.",
      },
    ],
    claims: [
      claim(
        "Private network destinations must be blocked.",
        "Private network destinations must be blocked before retrieval."
      ),
      claim(
        "Exact quotes must be verified.",
        "Exact quotes must be verified against normalized captured text."
      ),
      claim(
        "Hostile instructions must be quarantined.",
        "Hostile source instructions must be quarantined before synthesis.",
        "mechanism"
      ),
    ],
    contradictions: [],
    opportunities: [
      {
        title: "Block private-network retrieval",
        problem: "External retrieval can cross trust boundaries.",
        expectedOutcome: "SSRF attempts fail closed.",
        evidenceClaimIndexes: [0],
        alternatives: ["Allow every URL"],
        estimatedCost: "small",
        risk: "low",
        uncertainty: "DNS rebinding requires continued hardening.",
        learningValue: "Proves the first network boundary.",
        smallestExperiment: "Reject private DNS fixtures.",
      },
      {
        title: "Persist exact citation spans",
        problem: "Source links alone are not reconstructible support.",
        expectedOutcome: "Reviewers can reproduce claim support.",
        evidenceClaimIndexes: [1],
        alternatives: ["Store links only"],
        estimatedCost: "small",
        risk: "low",
        uncertainty: "DOM locators are not yet stored.",
        learningValue: "Measures citation precision.",
        smallestExperiment: "Verify one manifest end to end.",
      },
      {
        title: "Quarantine hostile documents",
        problem: "Source text may contain agent-directed instructions.",
        expectedOutcome: "Unsafe text cannot reach synthesis.",
        evidenceClaimIndexes: [2],
        alternatives: ["Trust all text"],
        estimatedCost: "small",
        risk: "medium",
        uncertainty: "Pattern checks are incomplete.",
        learningValue: "Creates an adversarial baseline.",
        smallestExperiment: "Reject one hostile fixture.",
      },
    ],
    decision: {
      selectedOpportunityIndex: 1,
      rejectedOpportunityIndexes: [0, 2],
      rationale: "Exact citations connect retrieval to independent review.",
    },
    experiment: {
      hypothesis: "Exact spans make unsupported external claims detectable.",
      method: "Capture one official source and verify three declared quotes.",
      successCriteria: ["All spans verify"],
      guardrails: ["No private network access"],
      rollbackPlan: ["Revert the adapter"],
    },
    handoff: {
      allowedScope: ["packages/evolution-core/src/public-*.ts"],
      forbiddenScope: ["secrets", "production"],
      acceptanceCriteria: ["Citation review passes"],
      verificationPlan: ["Run public CLI tests"],
      rollbackPlan: ["Revert the bounded changes"],
    },
  };
}

describe("public research CLI", () => {
  it("persists a reviewed planned cycle and reloads exact citation spans", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-public-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".cyclewarden");
    const manifestPath = join(root, "public-research.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`, "utf8");

    const store = new EvolutionStore(storeRoot);
    const created = createCycle({
      cycleId: "public-cli:cycle-001",
      objective: "Choose the next externally supported product experiment",
      autonomy: "A2",
      risk: "R1",
    });
    await store.create(created);
    const observed = transitionCycle(created, "observed", {
      actor: "inspector",
      reason: "captured baseline",
      addArtifacts: { baseline: ["evidence:baseline"] },
    });
    await store.save(created, observed);
    const modeled = transitionCycle(observed, "modeled", {
      actor: "assessor",
      reason: "created model",
      addArtifacts: { model: ["evidence:model"] },
    });
    await store.save(observed, modeled);

    const body = [
      "Private network destinations must be blocked before retrieval.",
      "Exact quotes must be verified against normalized captured text.",
      "Hostile source instructions must be quarantined before synthesis.",
    ].join(" ");
    const fetcher: PublicFetch = async () => ({
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? "text/plain" : null) },
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    });
    const output = collector();
    await expect(
      runPublicResearchCli(
        [
          "public-cli:cycle-001",
          "--root",
          storeRoot,
          "--project-root",
          root,
          "--manifest",
          manifestPath,
          "--actor",
          "public-researcher",
          "--reviewer",
          "citation-reviewer",
        ],
        output.io,
        { fetcher, resolveAddresses: async () => ["93.184.216.34"] }
      )
    ).resolves.toBe(0);

    const result = JSON.parse(output.output().stdout);
    expect(result.outcome).toBe("completed");
    expect(result.cycle.stage).toBe("planned");
    expect(result.evaluation.verdict).toBe("pass");
    expect(result.citationSpans).toHaveLength(3);
    expect(result.citationSpans.every((span: { verified: boolean }) => span.verified)).toBe(true);

    const persisted = await store.load("public-cli:cycle-001");
    expect(persisted.stage).toBe("planned");
    expect(persisted.research?.runs.at(-1)?.adapter).toBe("public-http-manifest");
    expect(persisted.research?.citationSpans).toHaveLength(3);
    expect(persisted.research?.evaluations.at(-1)?.actor).toBe("citation-reviewer");
  });
});
