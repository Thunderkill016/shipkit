import { createHash } from "node:crypto";
import type { PreparedResearchHandoff } from "./research.js";
import type {
  ResearchEvaluationRecord,
  ResearchReviewCheck,
  ResearchRunRecord,
} from "./types.js";

export type ResearchReviewOptions = {
  reviewerActor: string;
  now?: string;
  evidenceRefs: string[];
  run: ResearchRunRecord;
};

function stableId(cycleId: string, payload: unknown): string {
  const digest = createHash("sha256")
    .update(JSON.stringify({ kind: "research-evaluation", cycleId, payload }))
    .digest("hex")
    .slice(0, 24);
  return `research-evaluation:${digest}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function check(
  id: ResearchReviewCheck["id"],
  passed: boolean,
  summary: string,
  evidenceRefs: string[] = []
): ResearchReviewCheck {
  return { id, passed, summary, evidenceRefs: unique(evidenceRefs) };
}

export function evaluatePreparedResearch(
  prepared: PreparedResearchHandoff,
  options: ResearchReviewOptions
): ResearchEvaluationRecord {
  const reviewerActor = options.reviewerActor.trim();
  if (!reviewerActor) throw new Error("reviewerActor is required");

  const { records } = prepared;
  const sourceById = new Map(records.sources.map((source) => [source.recordId, source]));
  const claimById = new Map(records.claims.map((claim) => [claim.recordId, claim]));
  const opportunityById = new Map(
    records.opportunities.map((opportunity) => [opportunity.recordId, opportunity])
  );

  const unsupportedClaimIds = records.claims
    .filter((claim) => {
      if (claim.supportingSourceIds.length === 0) return true;
      if (claim.claimType !== "user-problem") return false;
      return !claim.supportingSourceIds.some(
        (sourceId) => sourceById.get(sourceId)?.sourceClass === "user-research"
      );
    })
    .map((claim) => claim.recordId);

  const contradictedClaimIds = new Set(
    records.claims
      .filter((claim) => claim.contradictingSourceIds.length > 0)
      .map((claim) => claim.recordId)
  );
  const contradictionClaimIds = new Set(records.contradictions.flatMap((item) => item.claimIds));
  const hiddenContradictions = [...contradictedClaimIds].filter(
    (claimId) => !contradictionClaimIds.has(claimId)
  );

  const allowed = new Set(records.executionHandoff.allowedScope);
  const scopeOverlap = records.executionHandoff.forbiddenScope.filter((scope) => allowed.has(scope));
  const expectedRejected = records.opportunities
    .map((opportunity) => opportunity.recordId)
    .filter((recordId) => recordId !== records.decision.selectedOpportunityId);

  const checks: ResearchReviewCheck[] = [
    check(
      "separate-reviewer",
      reviewerActor !== records.brief.actor,
      reviewerActor !== records.brief.actor
        ? "Reviewer actor is distinct from the researcher actor."
        : "Reviewer actor must be distinct from the researcher actor."
    ),
    check(
      "budget-compliance",
      options.run.usage.queries <= records.plan.budget.maxQueries &&
        options.run.usage.sources <= records.plan.budget.maxSources &&
        options.run.usage.minutes <= records.plan.budget.maxMinutes &&
        options.run.usage.costUsd <= records.plan.budget.maxCostUsd,
      `Used ${options.run.usage.queries}/${records.plan.budget.maxQueries} queries, ${options.run.usage.sources}/${records.plan.budget.maxSources} sources, ${options.run.usage.minutes}/${records.plan.budget.maxMinutes} minutes, and $${options.run.usage.costUsd.toFixed(2)}/$${records.plan.budget.maxCostUsd.toFixed(2)}.`
    ),
    check(
      "source-support",
      records.claims.length > 0 &&
        records.claims.every(
          (claim) =>
            claim.supportingSourceIds.length > 0 &&
            claim.supportingSourceIds.every((sourceId) => sourceById.has(sourceId))
        ),
      "Every claim must resolve to at least one persisted supporting source."
    ),
    check(
      "user-evidence",
      unsupportedClaimIds.length === 0,
      unsupportedClaimIds.length === 0
        ? "No user-problem claim exceeds the available user-research evidence."
        : `${unsupportedClaimIds.length} user-problem or unsupported claim(s) require stronger evidence.`,
      unsupportedClaimIds
    ),
    check(
      "opportunity-portfolio",
      records.opportunities.length >= 3 &&
        records.opportunities.every(
          (opportunity) =>
            opportunity.evidenceClaimIds.length > 0 &&
            opportunity.evidenceClaimIds.every((claimId) => claimById.has(claimId))
        ),
      "The portfolio must preserve at least three opportunities with valid claim links."
    ),
    check(
      "decision-preservation",
      opportunityById.has(records.decision.selectedOpportunityId) &&
        expectedRejected.every((recordId) => records.decision.rejectedOpportunityIds.includes(recordId)),
      "The selected opportunity and rejected alternatives must remain inspectable."
    ),
    check(
      "scope-separation",
      scopeOverlap.length === 0,
      scopeOverlap.length === 0
        ? "Allowed and forbidden execution scopes do not overlap."
        : `Overlapping execution scopes: ${scopeOverlap.join(", ")}.`
    ),
    check(
      "contradiction-visibility",
      hiddenContradictions.length === 0,
      hiddenContradictions.length === 0
        ? "Claims with contrary evidence remain visible through contradiction records."
        : `${hiddenContradictions.length} contradicted claim(s) are missing contradiction records.`,
      hiddenContradictions
    ),
    check(
      "stop-reason",
      options.run.stopReason.trim().length > 0,
      options.run.stopReason.trim().length > 0
        ? `Research stopped because: ${options.run.stopReason}`
        : "A bounded research run requires an explicit stop reason."
    ),
  ];

  const failed = checks.filter((item) => !item.passed);
  const unresolvedContradictionIds = records.contradictions
    .filter((item) => item.status === "open")
    .map((item) => item.recordId);
  const sourceClasses = new Set(records.sources.map((source) => source.sourceClass));
  const limitations = [
    ...(sourceClasses.has("user-research")
      ? []
      : ["No direct user-research source is present; repository evidence cannot establish user demand."]),
    ...(sourceClasses.size === 1 && sourceClasses.has("repository")
      ? ["All sources are repository-derived and are not independent external corroboration."]
      : []),
    ...(unresolvedContradictionIds.length > 0
      ? [`${unresolvedContradictionIds.length} contradiction(s) remain open.`]
      : []),
  ];

  const verdict: ResearchEvaluationRecord["verdict"] =
    options.run.outcome === "inconclusive" ? "inconclusive" : failed.length === 0 ? "pass" : "revise";
  const createdAt = options.now ?? new Date().toISOString();
  const payload = {
    researcherActor: records.brief.actor,
    reviewerActor,
    verdict,
    checks,
    unsupportedClaimIds,
    unresolvedContradictionIds,
    stopReason: options.run.stopReason,
    limitations,
  };

  return {
    recordId: stableId(records.brief.cycleId, payload),
    cycleId: records.brief.cycleId,
    actor: reviewerActor,
    createdAt,
    evidenceRefs: unique(options.evidenceRefs),
    kind: "research-evaluation",
    researcherActor: records.brief.actor,
    verdict,
    checks,
    unsupportedClaimIds,
    unresolvedContradictionIds,
    stopReason: options.run.stopReason,
    limitations,
  };
}

export function assertResearchReviewPassed(evaluation: ResearchEvaluationRecord): void {
  if (evaluation.verdict === "pass") return;
  const failures = evaluation.checks
    .filter((item) => !item.passed)
    .map((item) => item.id)
    .join(", ");
  throw new Error(
    `research review ${evaluation.verdict}${failures ? `; failed checks: ${failures}` : ""}`
  );
}
