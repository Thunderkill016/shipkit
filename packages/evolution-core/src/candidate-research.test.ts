import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { prepareCandidateResearch, type CapabilityRegistrySnapshot } from "./candidate-research.js";
import { createCycle, transitionCycle, type EvolutionCycle } from "./index.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/shipkit-next-workstream.candidates.json", import.meta.url), "utf8")
);

const capabilities: CapabilityRegistrySnapshot = {
  schemaVersion: 1,
  project: "shipkit",
  lastVerified: "2026-07-23",
  capabilities: [
    {
      id: "evolution-state-machine",
      status: "implemented",
      verificationStatus: "passing",
      summary: "Deterministic evidence-gated lifecycle stages govern the unified product loop.",
      evidence: ["packages/evolution-core/src/state-machine.ts"],
      checks: ["CI: Test & Build"],
      limitations: [],
    },
    {
      id: "research-intelligence",
      status: "partial",
      verificationStatus: "passing",
      summary: "Research is durable and reviewed but external decision value is not yet proven.",
      evidence: ["packages/evolution-core/src/repository-research.ts"],
      checks: ["CI: Evolution Engine Proof"],
      limitations: ["No candidate-specific decision grounding yet"],
    },
    {
      id: "temporary-workspace-assessment",
      status: "partial",
      verificationStatus: "passing",
      summary: "Trusted repositories can use an honestly named trusted-local backend.",
      evidence: ["packages/evolution-core/src/check-runner.ts"],
      checks: ["CI: Evolution Engine Proof"],
      limitations: ["Trusted-local is not a security sandbox"],
    },
    {
      id: "sandboxed-agent-execution",
      status: "partial",
      verificationStatus: "passing",
      summary: "A hostile-tested Docker baseline exists but no coding-agent adapter consumes handoffs.",
      evidence: ["packages/evolution-core/src/execution-backend.ts"],
      checks: ["CI: Sandbox / hostile Docker proof"],
      limitations: ["No hard writable-workspace disk quota"],
    },
  ],
};

function modeledCycle(): EvolutionCycle {
  let cycle = createCycle({
    cycleId: "shipkit:candidate-research-001",
    objective: "Choose Shipkit's next workstream",
    autonomy: "A2",
    risk: "R1",
    now: "2026-07-23T13:00:00.000Z",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "inspector",
    reason: "captured baseline",
    now: "2026-07-23T13:01:00.000Z",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  return transitionCycle(cycle, "modeled", {
    actor: "assessor",
    reason: "created model",
    now: "2026-07-23T13:02:00.000Z",
    addArtifacts: { model: ["evidence:model"] },
  });
}

function prepare(rawManifest: unknown = fixture) {
  return prepareCandidateResearch(modeledCycle(), rawManifest, capabilities, {
    actor: "candidate-researcher",
    reviewerActor: "independent-candidate-reviewer",
    now: "2026-07-23T13:03:00.000Z",
    startedAt: "2026-07-23T13:02:30.000Z",
    evidenceRefs: {
      manifest: "evidence:candidate-manifest",
      capabilities: "evidence:capabilities",
    },
  });
}

describe("candidate-grounded research", () => {
  it("compares the exact named alternatives and selects the unique current leader", () => {
    const prepared = prepare();

    expect(prepared.outcome).toBe("completed");
    if (prepared.outcome !== "completed") throw new Error("expected completed candidate research");
    expect(prepared.planned.stage).toBe("planned");
    expect(prepared.run.adapter).toBe("candidate-manifest");
    expect(prepared.run.usage).toMatchObject({ queries: 5, costUsd: 0 });
    expect(prepared.evaluation.verdict).toBe("pass");
    expect(prepared.records.opportunities.map((item) => item.title)).toEqual([
      "#15: Standalone Evolution Core",
      "#13: Minimal candidate-grounded research",
      "#12: Remaining sandbox hardening",
      "#17: Governed coding-agent execution",
    ]);
    expect(
      prepared.records.opportunities.find(
        (item) => item.recordId === prepared.records.decision.selectedOpportunityId
      )?.title
    ).toBe("#13: Minimal candidate-grounded research");
    expect(prepared.records.decision.rejectedOpportunityIds).toHaveLength(3);
    expect(prepared.records.contradictions.some((item) => item.summary.includes("#15"))).toBe(true);
    expect(prepared.records.claims.some((item) => item.statement.includes("selected path is trusted-local"))).toBe(true);
    expect(prepared.records.claims.some((item) => item.statement.includes("separate Docker baseline"))).toBe(true);
    expect(
      prepared.records.experiment.guardrails.some(
        (item) => item.includes('"participants":6') && item.includes('"repositories":6')
      )
    ).toBe(true);
    expect(prepared.records.executionHandoff.parameterDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns durable inconclusive when a capability expectation is stale", () => {
    const stale = structuredClone(fixture);
    stale.candidates[2].evidence.find((item: any) => item.kind === "capability").expectedStatus =
      "planned";

    const prepared = prepare(stale);

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected inconclusive candidate research");
    expect(prepared.reason).toMatch(/Stale capability assertion/);
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.evaluation.verdict).toBe("inconclusive");
  });

  it("returns inconclusive instead of inventing a candidate with missing evidence", () => {
    const missing = structuredClone(fixture);
    missing.candidates[3].evidence = missing.candidates[3].evidence.filter(
      (item: any) => item.kind !== "implementation"
    );

    const prepared = prepare(missing);

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected inconclusive candidate research");
    expect(prepared.reason).toContain("missing required evidence categories: implementation");
  });

  it("returns inconclusive when deterministic candidate scores are tied", () => {
    const tied = structuredClone(fixture);
    tied.candidates[2].priority = { ...tied.candidates[1].priority };

    const prepared = prepare(tied);

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected inconclusive candidate research");
    expect(prepared.reason).toMatch(/tied/);
  });
});
