import { describe, expect, it } from "vitest";
import {
  EvolutionError,
  authorizeAction,
  createCycle,
  transitionCycle,
  type EvolutionCycle,
  type EvolutionStage,
} from "./index.js";

function step(
  cycle: EvolutionCycle,
  to: EvolutionStage,
  bucket?: keyof EvolutionCycle["artifacts"],
  options: { verificationPassed?: boolean } = {}
): EvolutionCycle {
  return transitionCycle(cycle, to, {
    actor: "test-agent",
    reason: `advance to ${to}`,
    verificationPassed: options.verificationPassed,
    addArtifacts: bucket ? { [bucket]: [`artifact:${to}`] } : undefined,
  });
}

describe("Evolution Engine kernel", () => {
  it("runs a complete evidence-backed cycle without mutating prior states", () => {
    const created = createCycle({
      cycleId: "shipkit:cycle-001",
      objective: "Improve repository onboarding reliability",
      autonomy: "A3",
      risk: "R1",
      now: "2026-07-23T00:00:00.000Z",
    });

    let current = step(created, "observed", "baseline");
    current = step(current, "modeled", "model");
    current = transitionCycle(current, "diagnosed", {
      actor: "test-agent",
      reason: "ranked observed failure modes",
      addArtifacts: {
        diagnosis: ["artifact:diagnosis"],
        candidates: ["artifact:candidates"],
      },
    });
    current = step(current, "researched", "research");
    current = step(current, "decided", "decision");
    current = transitionCycle(current, "planned", {
      actor: "test-agent",
      reason: "bounded plan with rollback",
      addArtifacts: { plan: ["artifact:plan"], rollback: ["artifact:rollback"] },
    });
    current = step(current, "executing");
    current = step(current, "implemented", "changes");
    current = step(current, "verified", "verification", { verificationPassed: true });
    current = step(current, "measured", "measurement");
    current = step(current, "learned", "memory");
    current = step(current, "meta-improved", "metaChanges");
    current = step(current, "completed");

    expect(current.stage).toBe("completed");
    expect(current.history).toHaveLength(13);
    expect(created.stage).toBe("created");
    expect(created.history).toHaveLength(0);
  });

  it("rejects skipped mandatory stages", () => {
    const cycle = createCycle({
      cycleId: "repo:cycle-002",
      objective: "Reduce flaky integration tests",
      autonomy: "A3",
      risk: "R1",
    });

    expect(() => step(cycle, "diagnosed", "diagnosis")).toThrow(EvolutionError);
  });

  it("blocks A2 from entering code execution", () => {
    let cycle = createCycle({
      cycleId: "repo:cycle-003",
      objective: "Audit dependency health without code edits",
      autonomy: "A2",
      risk: "R1",
    });
    cycle = step(cycle, "observed", "baseline");
    cycle = step(cycle, "modeled", "model");
    cycle = transitionCycle(cycle, "diagnosed", {
      actor: "auditor",
      reason: "found candidates",
      addArtifacts: { diagnosis: ["d"], candidates: ["c"] },
    });
    cycle = step(cycle, "researched", "research");
    cycle = step(cycle, "decided", "decision");
    cycle = transitionCycle(cycle, "planned", {
      actor: "auditor",
      reason: "prepared a human-executable plan",
      addArtifacts: { plan: ["p"], rollback: ["r"] },
    });

    expect(() => step(cycle, "executing")).toThrow(/requires A3/);
  });

  it("requires explicit approval for protected actions and high-risk writes", () => {
    expect(
      authorizeAction({ autonomy: "A4", risk: "R2", action: "deploy" })
    ).toMatchObject({ allowed: false, requiresApproval: true });

    expect(
      authorizeAction({
        autonomy: "A4",
        risk: "R2",
        action: "deploy",
        approvals: [
          {
            action: "deploy",
            approvedBy: "human-owner",
            approvedAt: "2026-07-23T00:00:00.000Z",
            scope: "staging deployment for cycle 004",
          },
        ],
      })
    ).toMatchObject({ allowed: true, requiresApproval: true });

    expect(
      authorizeAction({ autonomy: "A3", risk: "R3", action: "modify-code" })
    ).toMatchObject({ allowed: false, requiresApproval: true });
  });

  it("cannot claim verification without passing evidence", () => {
    let cycle = createCycle({
      cycleId: "repo:cycle-005",
      objective: "Improve checkout error recovery",
      autonomy: "A3",
      risk: "R1",
    });
    cycle = step(cycle, "observed", "baseline");
    cycle = step(cycle, "modeled", "model");
    cycle = transitionCycle(cycle, "diagnosed", {
      actor: "agent",
      reason: "diagnosed failure",
      addArtifacts: { diagnosis: ["d"], candidates: ["c"] },
    });
    cycle = step(cycle, "researched", "research");
    cycle = step(cycle, "decided", "decision");
    cycle = transitionCycle(cycle, "planned", {
      actor: "agent",
      reason: "planned fix",
      addArtifacts: { plan: ["p"], rollback: ["r"] },
    });
    cycle = step(cycle, "executing");
    cycle = step(cycle, "implemented", "changes");

    expect(() => step(cycle, "verified", "verification")).toThrow(
      /explicitly passing/
    );
  });
});
