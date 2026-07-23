import { describe, expect, it } from "vitest";
import {
  createCycle,
  prepareResearchToExecution,
  transitionCycle,
  type EvolutionCycle,
} from "./index.js";

function modeledCycle(): EvolutionCycle {
  let cycle = createCycle({
    cycleId: "shipkit:research-001",
    objective: "Choose the highest-value onboarding experiment",
    autonomy: "A2",
    risk: "R1",
    now: "2026-07-23T00:00:00.000Z",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "inspector",
    reason: "captured baseline",
    now: "2026-07-23T00:01:00.000Z",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  return transitionCycle(cycle, "modeled", {
    actor: "assessor",
    reason: "created readiness model",
    now: "2026-07-23T00:02:00.000Z",
    addArtifacts: { model: ["evidence:model"] },
  });
}

function bundle() {
  return {
    brief: {
      decisionQuestion: "Which onboarding experiment should Shipkit run first?",
      owner: "product-owner",
      assumptions: ["Developers can attach an existing repository"],
      constraints: ["No code mutation during research"],
      protectedOutcomes: ["Do not expose repository secrets"],
    },
    plan: {
      questions: ["Where do developers abandon setup?"],
      sourceStrategy: ["Repository evidence", "Primary user evidence"],
      budget: { maxQueries: 8, maxSources: 12, maxMinutes: 30, maxCostUsd: 0 },
      stopConditions: ["A reversible experiment is more useful than more desk research"],
    },
    queries: [
      {
        query: "repository onboarding failure evidence",
        rationale: "Find direct evidence for setup friction",
        tool: "repository-search",
        resultRefs: ["result:setup"],
      },
    ],
    sources: [
      {
        canonicalId: "repo:readme",
        title: "Shipkit README",
        publisher: "Shipkit",
        sourceClass: "repository",
        authority: 1,
        directness: 1,
        freshness: 1,
        applicability: 1,
        independence: 0.3,
        evidenceRefs: ["evidence:readme"],
      },
      {
        canonicalId: "interview:developer-1",
        title: "Developer onboarding interview",
        publisher: "Shipkit research",
        sourceClass: "user-research",
        authority: 0.8,
        directness: 1,
        freshness: 1,
        applicability: 0.9,
        independence: 0.8,
        evidenceRefs: ["evidence:interview"],
      },
    ],
    claims: [
      {
        statement: "Setup has too many disconnected commands.",
        claimType: "user-problem",
        confidence: 0.8,
        uncertainty: "Only one external user has been interviewed.",
        supportingSourceIndexes: [0, 1],
      },
      {
        statement: "The current CLI is sufficient for experienced maintainers.",
        claimType: "prediction",
        confidence: 0.45,
        uncertainty: "No repeated-use evidence exists.",
        supportingSourceIndexes: [0],
        contradictingSourceIndexes: [1],
      },
    ],
    contradictions: [
      {
        claimIndexes: [0, 1],
        summary: "Repository completeness conflicts with observed user setup friction.",
        suspectedCause: "Documentation presence does not prove workflow usability.",
        affectedDecision: "Whether to prioritize a guided workspace flow.",
      },
    ],
    opportunities: [
      {
        title: "Guided attach-project flow",
        problem: "Users must manually join initialization, inspection, and assessment.",
        expectedOutcome: "More users reach a modeled cycle.",
        evidenceClaimIndexes: [0],
        alternatives: ["Improve README only"],
        estimatedCost: "medium",
        risk: "low",
        uncertainty: "Workspace demand is not yet measured at scale.",
        learningValue: "Tests whether workflow integration matters.",
        smallestExperiment: "Prototype one guided attach flow for a local repository.",
      },
      {
        title: "Single setup command",
        problem: "Setup requires multiple commands.",
        expectedOutcome: "Lower time to first model.",
        evidenceClaimIndexes: [0],
        alternatives: ["Shell script documentation"],
        estimatedCost: "small",
        risk: "low",
        uncertainty: "May hide useful configuration choices.",
        learningValue: "Measures whether command count is the main blocker.",
        smallestExperiment: "Add a dry-run setup orchestrator.",
      },
      {
        title: "Repository readiness report",
        problem: "Users cannot see why execution remains blocked.",
        expectedOutcome: "Better trust and next-action clarity.",
        evidenceClaimIndexes: [1],
        alternatives: ["Raw JSON output"],
        estimatedCost: "small",
        risk: "low",
        uncertainty: "Experienced users may prefer CLI output.",
        learningValue: "Tests whether explainability drives repeat use.",
        smallestExperiment: "Render one read-only readiness summary.",
      },
    ],
    decision: {
      selectedOpportunityIndex: 0,
      rejectedOpportunityIndexes: [1, 2],
      rationale: "It integrates existing capabilities and tests the core product thesis.",
    },
    experiment: {
      hypothesis: "A guided attach flow reduces time to a modeled cycle.",
      method: "Observe five repository attachments with and without the guided flow.",
      successCriteria: ["Median time to modeled cycle decreases by at least 30%."],
      guardrails: ["No secrets are captured.", "CLI remains available."],
      rollbackPlan: ["Remove the workspace route and retain the CLI flow."],
    },
    handoff: {
      allowedScope: ["apps/web", "packages/evolution-core"],
      forbiddenScope: ["production", "secrets", "automatic deploy"],
      acceptanceCriteria: ["A user can create a modeled cycle from one guided flow."],
      verificationPlan: ["Unit tests", "Demo E2E", "Portable PostgreSQL E2E"],
      rollbackPlan: ["Revert the guided flow without changing stored cycle records."],
    },
  };
}

describe("research-to-execution handoff", () => {
  it("advances one durable cycle and preserves typed decision records", () => {
    const modeled = modeledCycle();
    const prepared = prepareResearchToExecution(modeled, bundle(), {
      actor: "shipkit-researcher",
      now: "2026-07-23T01:00:00.000Z",
      evidenceRefs: ["evidence:research-bundle"],
    });

    expect(prepared.planned.stage).toBe("planned");
    expect(prepared.planned.history).toHaveLength(6);
    expect(prepared.planned.research?.opportunities).toHaveLength(3);
    expect(prepared.planned.research?.contradictions).toHaveLength(1);
    expect(prepared.records.decision.selectedOpportunityId).toBe(
      prepared.records.opportunities[0]?.recordId
    );
    expect(prepared.records.executionHandoff.parameterDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared.records.executionHandoff.allowedScope).toContain("apps/web");
    expect(modeled.stage).toBe("modeled");
    expect(modeled.research?.opportunities).toHaveLength(0);
  });

  it("rejects an incomplete opportunity portfolio", () => {
    const invalid = bundle();
    invalid.opportunities = invalid.opportunities.slice(0, 2);
    expect(() =>
      prepareResearchToExecution(modeledCycle(), invalid, {
        actor: "shipkit-researcher",
        evidenceRefs: ["evidence:research-bundle"],
      })
    ).toThrow(/at least three opportunities/);
  });

  it("requires a modeled cycle", () => {
    const cycle = createCycle({
      cycleId: "shipkit:research-002",
      objective: "Prepare an evidence-backed experiment",
      autonomy: "A2",
      risk: "R1",
    });
    expect(() =>
      prepareResearchToExecution(cycle, bundle(), {
        actor: "shipkit-researcher",
        evidenceRefs: ["evidence:research-bundle"],
      })
    ).toThrow(/requires a modeled cycle/);
  });
});
