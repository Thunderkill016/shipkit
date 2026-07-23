import { createHash } from "node:crypto";
import { transitionCycle } from "./state-machine.js";
import type {
  ClaimRecord,
  ContradictionRecord,
  DecisionRecord,
  EvolutionCycle,
  ExecutionHandoff,
  ExperimentRecord,
  OpportunityRecord,
  QueryRecord,
  ResearchBrief,
  ResearchBudget,
  ResearchClaimType,
  ResearchPlan,
  ResearchSourceClass,
  SourceRecord,
} from "./types.js";

export type ResearchBundleInput = {
  brief: {
    decisionQuestion: string;
    owner?: string;
    deadline?: string | null;
    assumptions?: string[];
    constraints?: string[];
    evidenceThreshold?: string;
    protectedOutcomes?: string[];
  };
  plan: {
    questions: string[];
    sourceStrategy: string[];
    budget?: Partial<ResearchBudget>;
    stopConditions: string[];
  };
  queries: Array<{
    query: string;
    rationale: string;
    tool?: string;
    parentQueryIndex?: number | null;
    resultRefs?: string[];
  }>;
  sources: Array<{
    canonicalId: string;
    title: string;
    publisher: string;
    sourceClass: ResearchSourceClass;
    version?: string | null;
    accessedAt?: string;
    license?: string | null;
    authority: number;
    directness: number;
    freshness: number;
    applicability: number;
    independence: number;
    conflictOfInterest?: string | null;
    evidenceRefs?: string[];
  }>;
  claims: Array<{
    statement: string;
    claimType: ResearchClaimType;
    confidence: number;
    uncertainty: string;
    supportingSourceIndexes: number[];
    contradictingSourceIndexes?: number[];
    expiresAt?: string | null;
  }>;
  contradictions?: Array<{
    claimIndexes: number[];
    summary: string;
    suspectedCause: string;
    affectedDecision: string;
    status?: ContradictionRecord["status"];
  }>;
  opportunities: Array<{
    title: string;
    problem: string;
    expectedOutcome: string;
    evidenceClaimIndexes: number[];
    alternatives?: string[];
    estimatedCost: string;
    risk: string;
    uncertainty: string;
    learningValue: string;
    smallestExperiment: string;
  }>;
  decision: {
    selectedOpportunityIndex: number;
    rejectedOpportunityIndexes?: number[];
    rationale: string;
  };
  experiment: {
    hypothesis: string;
    method: string;
    successCriteria: string[];
    guardrails: string[];
    rollbackPlan: string[];
  };
  handoff: {
    allowedScope: string[];
    forbiddenScope: string[];
    acceptanceCriteria: string[];
    verificationPlan: string[];
    rollbackPlan: string[];
  };
};

export type PrepareResearchOptions = {
  actor: string;
  now?: string;
  evidenceRefs: string[];
};

export type PreparedResearchHandoff = {
  diagnosed: EvolutionCycle;
  researched: EvolutionCycle;
  decided: EvolutionCycle;
  planned: EvolutionCycle;
  records: {
    brief: ResearchBrief;
    plan: ResearchPlan;
    queries: QueryRecord[];
    sources: SourceRecord[];
    claims: ClaimRecord[];
    contradictions: ContradictionRecord[];
    opportunities: OpportunityRecord[];
    decision: DecisionRecord;
    experiment: ExperimentRecord;
    executionHandoff: ExecutionHandoff;
  };
};

const SOURCE_CLASSES = new Set<ResearchSourceClass>([
  "repository",
  "user-research",
  "primary-technical",
  "official-documentation",
  "independent-reproduction",
  "community",
  "unverified",
]);

const CLAIM_TYPES = new Set<ResearchClaimType>([
  "fact",
  "mechanism",
  "limitation",
  "user-problem",
  "prediction",
  "recommendation",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function optionalText(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, label);
}

function texts(value: unknown, label: string, minimum = 0): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result = [...new Set(value.map((item) => text(item, label)))];
  if (result.length < minimum) throw new Error(`${label} requires at least ${minimum} item(s)`);
  return result;
}

function finiteNumber(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeNumber(value: unknown, label: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}

function index(value: unknown, label: string, length: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= length) {
    throw new Error(`${label} must reference an existing item`);
  }
  return value;
}

function indexes(value: unknown, label: string, length: number, minimum = 0): number[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result = [...new Set(value.map((item) => index(item, label, length)))];
  if (result.length < minimum) throw new Error(`${label} requires at least ${minimum} item(s)`);
  return result;
}

function dateOrNull(value: unknown, label: string): string | null {
  const parsed = optionalText(value, label);
  if (parsed !== null && !Number.isFinite(Date.parse(parsed))) {
    throw new Error(`${label} must be an ISO-compatible date`);
  }
  return parsed;
}

function recordId(kind: string, cycleId: string, position: number, payload: unknown): string {
  const digest = createHash("sha256")
    .update(JSON.stringify({ kind, cycleId, position, payload }))
    .digest("hex")
    .slice(0, 24);
  return `${kind}:${digest}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function base(
  kind: string,
  cycleId: string,
  position: number,
  payload: unknown,
  actor: string,
  createdAt: string,
  evidenceRefs: string[]
) {
  return {
    recordId: recordId(kind, cycleId, position, payload),
    cycleId,
    actor,
    createdAt,
    evidenceRefs: [...new Set(evidenceRefs.map((item) => item.trim()).filter(Boolean))],
  };
}

export function parseResearchBundle(value: unknown): ResearchBundleInput {
  if (!isObject(value)) throw new Error("research bundle must be an object");
  if (!isObject(value.brief) || !isObject(value.plan) || !isObject(value.decision)) {
    throw new Error("research bundle requires brief, plan, and decision objects");
  }
  if (!isObject(value.experiment) || !isObject(value.handoff)) {
    throw new Error("research bundle requires experiment and handoff objects");
  }
  if (!Array.isArray(value.queries) || !Array.isArray(value.sources) || !Array.isArray(value.claims)) {
    throw new Error("research bundle requires query, source, and claim arrays");
  }
  if (!Array.isArray(value.opportunities) || value.opportunities.length < 3) {
    throw new Error("research bundle requires at least three opportunities");
  }

  const budgetInput = isObject(value.plan.budget) ? value.plan.budget : {};
  const budget: ResearchBudget = {
    maxQueries: positiveInteger(budgetInput.maxQueries, "plan.budget.maxQueries", 20),
    maxSources: positiveInteger(budgetInput.maxSources, "plan.budget.maxSources", 30),
    maxMinutes: positiveInteger(budgetInput.maxMinutes, "plan.budget.maxMinutes", 60),
    maxCostUsd: nonNegativeNumber(budgetInput.maxCostUsd, "plan.budget.maxCostUsd", 0),
  };

  const queries = value.queries.map((entry, entryIndex) => {
    if (!isObject(entry)) throw new Error(`queries[${entryIndex}] must be an object`);
    const parentQueryIndex = entry.parentQueryIndex;
    return {
      query: text(entry.query, `queries[${entryIndex}].query`),
      rationale: text(entry.rationale, `queries[${entryIndex}].rationale`),
      tool: optionalText(entry.tool, `queries[${entryIndex}].tool`) ?? "unspecified",
      parentQueryIndex:
        parentQueryIndex === undefined || parentQueryIndex === null
          ? null
          : index(parentQueryIndex, `queries[${entryIndex}].parentQueryIndex`, value.queries.length),
      resultRefs: texts(entry.resultRefs ?? [], `queries[${entryIndex}].resultRefs`),
    };
  });

  const sources = value.sources.map((entry, entryIndex) => {
    if (!isObject(entry)) throw new Error(`sources[${entryIndex}] must be an object`);
    const sourceClass = text(entry.sourceClass, `sources[${entryIndex}].sourceClass`) as ResearchSourceClass;
    if (!SOURCE_CLASSES.has(sourceClass)) {
      throw new Error(`sources[${entryIndex}].sourceClass is invalid`);
    }
    const accessedAt = optionalText(entry.accessedAt, `sources[${entryIndex}].accessedAt`) ?? new Date().toISOString();
    if (!Number.isFinite(Date.parse(accessedAt))) {
      throw new Error(`sources[${entryIndex}].accessedAt must be an ISO-compatible date`);
    }
    return {
      canonicalId: text(entry.canonicalId, `sources[${entryIndex}].canonicalId`),
      title: text(entry.title, `sources[${entryIndex}].title`),
      publisher: text(entry.publisher, `sources[${entryIndex}].publisher`),
      sourceClass,
      version: optionalText(entry.version, `sources[${entryIndex}].version`),
      accessedAt,
      license: optionalText(entry.license, `sources[${entryIndex}].license`),
      authority: finiteNumber(entry.authority, `sources[${entryIndex}].authority`, 0, 1),
      directness: finiteNumber(entry.directness, `sources[${entryIndex}].directness`, 0, 1),
      freshness: finiteNumber(entry.freshness, `sources[${entryIndex}].freshness`, 0, 1),
      applicability: finiteNumber(entry.applicability, `sources[${entryIndex}].applicability`, 0, 1),
      independence: finiteNumber(entry.independence, `sources[${entryIndex}].independence`, 0, 1),
      conflictOfInterest: optionalText(
        entry.conflictOfInterest,
        `sources[${entryIndex}].conflictOfInterest`
      ),
      evidenceRefs: texts(entry.evidenceRefs ?? [], `sources[${entryIndex}].evidenceRefs`),
    };
  });

  const claims = value.claims.map((entry, entryIndex) => {
    if (!isObject(entry)) throw new Error(`claims[${entryIndex}] must be an object`);
    const claimType = text(entry.claimType, `claims[${entryIndex}].claimType`) as ResearchClaimType;
    if (!CLAIM_TYPES.has(claimType)) throw new Error(`claims[${entryIndex}].claimType is invalid`);
    return {
      statement: text(entry.statement, `claims[${entryIndex}].statement`),
      claimType,
      confidence: finiteNumber(entry.confidence, `claims[${entryIndex}].confidence`, 0, 1),
      uncertainty: text(entry.uncertainty, `claims[${entryIndex}].uncertainty`),
      supportingSourceIndexes: indexes(
        entry.supportingSourceIndexes,
        `claims[${entryIndex}].supportingSourceIndexes`,
        sources.length,
        1
      ),
      contradictingSourceIndexes: indexes(
        entry.contradictingSourceIndexes ?? [],
        `claims[${entryIndex}].contradictingSourceIndexes`,
        sources.length
      ),
      expiresAt: dateOrNull(entry.expiresAt, `claims[${entryIndex}].expiresAt`),
    };
  });

  const contradictions = (Array.isArray(value.contradictions) ? value.contradictions : []).map(
    (entry, entryIndex) => {
      if (!isObject(entry)) throw new Error(`contradictions[${entryIndex}] must be an object`);
      const status = (optionalText(entry.status, `contradictions[${entryIndex}].status`) ??
        "open") as ContradictionRecord["status"];
      if (!new Set(["open", "resolved", "accepted-uncertainty"]).has(status)) {
        throw new Error(`contradictions[${entryIndex}].status is invalid`);
      }
      return {
        claimIndexes: indexes(
          entry.claimIndexes,
          `contradictions[${entryIndex}].claimIndexes`,
          claims.length,
          2
        ),
        summary: text(entry.summary, `contradictions[${entryIndex}].summary`),
        suspectedCause: text(entry.suspectedCause, `contradictions[${entryIndex}].suspectedCause`),
        affectedDecision: text(
          entry.affectedDecision,
          `contradictions[${entryIndex}].affectedDecision`
        ),
        status,
      };
    }
  );

  const opportunities = value.opportunities.map((entry, entryIndex) => {
    if (!isObject(entry)) throw new Error(`opportunities[${entryIndex}] must be an object`);
    return {
      title: text(entry.title, `opportunities[${entryIndex}].title`),
      problem: text(entry.problem, `opportunities[${entryIndex}].problem`),
      expectedOutcome: text(entry.expectedOutcome, `opportunities[${entryIndex}].expectedOutcome`),
      evidenceClaimIndexes: indexes(
        entry.evidenceClaimIndexes,
        `opportunities[${entryIndex}].evidenceClaimIndexes`,
        claims.length,
        1
      ),
      alternatives: texts(entry.alternatives ?? [], `opportunities[${entryIndex}].alternatives`),
      estimatedCost: text(entry.estimatedCost, `opportunities[${entryIndex}].estimatedCost`),
      risk: text(entry.risk, `opportunities[${entryIndex}].risk`),
      uncertainty: text(entry.uncertainty, `opportunities[${entryIndex}].uncertainty`),
      learningValue: text(entry.learningValue, `opportunities[${entryIndex}].learningValue`),
      smallestExperiment: text(
        entry.smallestExperiment,
        `opportunities[${entryIndex}].smallestExperiment`
      ),
    };
  });

  return {
    brief: {
      decisionQuestion: text(value.brief.decisionQuestion, "brief.decisionQuestion"),
      owner: optionalText(value.brief.owner, "brief.owner") ?? "unassigned",
      deadline: dateOrNull(value.brief.deadline, "brief.deadline"),
      assumptions: texts(value.brief.assumptions ?? [], "brief.assumptions"),
      constraints: texts(value.brief.constraints ?? [], "brief.constraints"),
      evidenceThreshold:
        optionalText(value.brief.evidenceThreshold, "brief.evidenceThreshold") ??
        "Material claims require at least one direct source and visible uncertainty.",
      protectedOutcomes: texts(value.brief.protectedOutcomes ?? [], "brief.protectedOutcomes"),
    },
    plan: {
      questions: texts(value.plan.questions, "plan.questions", 1),
      sourceStrategy: texts(value.plan.sourceStrategy, "plan.sourceStrategy", 1),
      budget,
      stopConditions: texts(value.plan.stopConditions, "plan.stopConditions", 1),
    },
    queries,
    sources,
    claims,
    contradictions,
    opportunities,
    decision: {
      selectedOpportunityIndex: index(
        value.decision.selectedOpportunityIndex,
        "decision.selectedOpportunityIndex",
        opportunities.length
      ),
      rejectedOpportunityIndexes: indexes(
        value.decision.rejectedOpportunityIndexes ?? opportunities.map((_, i) => i).filter(
          (i) => i !== value.decision.selectedOpportunityIndex
        ),
        "decision.rejectedOpportunityIndexes",
        opportunities.length
      ),
      rationale: text(value.decision.rationale, "decision.rationale"),
    },
    experiment: {
      hypothesis: text(value.experiment.hypothesis, "experiment.hypothesis"),
      method: text(value.experiment.method, "experiment.method"),
      successCriteria: texts(value.experiment.successCriteria, "experiment.successCriteria", 1),
      guardrails: texts(value.experiment.guardrails, "experiment.guardrails", 1),
      rollbackPlan: texts(value.experiment.rollbackPlan, "experiment.rollbackPlan", 1),
    },
    handoff: {
      allowedScope: texts(value.handoff.allowedScope, "handoff.allowedScope", 1),
      forbiddenScope: texts(value.handoff.forbiddenScope, "handoff.forbiddenScope", 1),
      acceptanceCriteria: texts(
        value.handoff.acceptanceCriteria,
        "handoff.acceptanceCriteria",
        1
      ),
      verificationPlan: texts(value.handoff.verificationPlan, "handoff.verificationPlan", 1),
      rollbackPlan: texts(value.handoff.rollbackPlan, "handoff.rollbackPlan", 1),
    },
  };
}

export function prepareResearchToExecution(
  cycle: EvolutionCycle,
  rawBundle: unknown,
  options: PrepareResearchOptions
): PreparedResearchHandoff {
  if (cycle.stage !== "modeled") {
    throw new Error(`research handoff requires a modeled cycle; current stage is ${cycle.stage}`);
  }
  const actor = text(options.actor, "actor");
  const evidenceRefs = texts(options.evidenceRefs, "evidenceRefs", 1);
  const bundle = parseResearchBundle(rawBundle);
  const now = options.now ?? new Date().toISOString();

  const brief: ResearchBrief = {
    ...base("research-brief", cycle.cycleId, 0, bundle.brief, actor, now, evidenceRefs),
    kind: "research-brief",
    ...bundle.brief,
  };
  const plan: ResearchPlan = {
    ...base("research-plan", cycle.cycleId, 0, bundle.plan, actor, now, evidenceRefs),
    kind: "research-plan",
    briefId: brief.recordId,
    ...bundle.plan,
  };

  const queries: QueryRecord[] = bundle.queries.map((entry, entryIndex, all) => ({
    ...base("query", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "query",
    query: entry.query,
    rationale: entry.rationale,
    tool: entry.tool ?? "unspecified",
    parentQueryId:
      entry.parentQueryIndex === null || entry.parentQueryIndex === undefined
        ? null
        : recordId("query", cycle.cycleId, entry.parentQueryIndex, all[entry.parentQueryIndex]),
    resultRefs: entry.resultRefs ?? [],
  }));

  const sources: SourceRecord[] = bundle.sources.map((entry, entryIndex) => ({
    ...base(
      "source",
      cycle.cycleId,
      entryIndex,
      entry,
      actor,
      now,
      [...evidenceRefs, ...(entry.evidenceRefs ?? [])]
    ),
    kind: "source",
    canonicalId: entry.canonicalId,
    title: entry.title,
    publisher: entry.publisher,
    sourceClass: entry.sourceClass,
    version: entry.version ?? null,
    accessedAt: entry.accessedAt ?? now,
    license: entry.license ?? null,
    authority: entry.authority,
    directness: entry.directness,
    freshness: entry.freshness,
    applicability: entry.applicability,
    independence: entry.independence,
    conflictOfInterest: entry.conflictOfInterest ?? null,
  }));

  const claims: ClaimRecord[] = bundle.claims.map((entry, entryIndex) => ({
    ...base("claim", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "claim",
    statement: entry.statement,
    claimType: entry.claimType,
    confidence: entry.confidence,
    uncertainty: entry.uncertainty,
    supportingSourceIds: entry.supportingSourceIndexes.map(
      (sourceIndex) => sources[sourceIndex]!.recordId
    ),
    contradictingSourceIds: (entry.contradictingSourceIndexes ?? []).map(
      (sourceIndex) => sources[sourceIndex]!.recordId
    ),
    expiresAt: entry.expiresAt ?? null,
  }));

  const contradictions: ContradictionRecord[] = (bundle.contradictions ?? []).map(
    (entry, entryIndex) => ({
      ...base("contradiction", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
      kind: "contradiction",
      claimIds: entry.claimIndexes.map((claimIndex) => claims[claimIndex]!.recordId),
      summary: entry.summary,
      suspectedCause: entry.suspectedCause,
      affectedDecision: entry.affectedDecision,
      status: entry.status ?? "open",
    })
  );

  const opportunities: OpportunityRecord[] = bundle.opportunities.map((entry, entryIndex) => ({
    ...base("opportunity", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "opportunity",
    title: entry.title,
    problem: entry.problem,
    expectedOutcome: entry.expectedOutcome,
    evidenceClaimIds: entry.evidenceClaimIndexes.map(
      (claimIndex) => claims[claimIndex]!.recordId
    ),
    alternatives: entry.alternatives ?? [],
    estimatedCost: entry.estimatedCost,
    risk: entry.risk,
    uncertainty: entry.uncertainty,
    learningValue: entry.learningValue,
    smallestExperiment: entry.smallestExperiment,
  }));

  const selectedOpportunity = opportunities[bundle.decision.selectedOpportunityIndex]!;
  const rejectedOpportunityIds = (bundle.decision.rejectedOpportunityIndexes ?? [])
    .filter((opportunityIndex) => opportunityIndex !== bundle.decision.selectedOpportunityIndex)
    .map((opportunityIndex) => opportunities[opportunityIndex]!.recordId);
  const decision: DecisionRecord = {
    ...base("decision", cycle.cycleId, 0, bundle.decision, actor, now, evidenceRefs),
    kind: "decision",
    selectedOpportunityId: selectedOpportunity.recordId,
    rejectedOpportunityIds,
    rationale: bundle.decision.rationale,
  };

  const experiment: ExperimentRecord = {
    ...base("experiment", cycle.cycleId, 0, bundle.experiment, actor, now, evidenceRefs),
    kind: "experiment",
    decisionId: decision.recordId,
    hypothesis: bundle.experiment.hypothesis,
    method: bundle.experiment.method,
    successCriteria: bundle.experiment.successCriteria,
    guardrails: bundle.experiment.guardrails,
    rollbackPlan: bundle.experiment.rollbackPlan,
  };

  const handoffPayload = {
    experimentId: experiment.recordId,
    objective: cycle.objective,
    ...bundle.handoff,
  };
  const executionHandoff: ExecutionHandoff = {
    ...base("execution-handoff", cycle.cycleId, 0, handoffPayload, actor, now, evidenceRefs),
    kind: "execution-handoff",
    ...handoffPayload,
    parameterDigest: digest(handoffPayload),
  };

  const diagnosed = transitionCycle(cycle, "diagnosed", {
    actor,
    reason: `Framed the decision and retained ${opportunities.length} research candidates`,
    now,
    addArtifacts: { diagnosis: evidenceRefs, candidates: evidenceRefs },
    appendResearch: { briefs: [brief], plans: [plan] },
  });
  const researched = transitionCycle(diagnosed, "researched", {
    actor,
    reason: `Recorded ${sources.length} sources, ${claims.length} claims, and visible contradictions`,
    now,
    addArtifacts: { research: evidenceRefs },
    appendResearch: { queries, sources, claims, contradictions, opportunities },
  });
  const decided = transitionCycle(researched, "decided", {
    actor,
    reason: `Selected opportunity ${selectedOpportunity.title} with rejected alternatives preserved`,
    now,
    addArtifacts: { decision: evidenceRefs },
    appendResearch: { decisions: [decision] },
  });
  const planned = transitionCycle(decided, "planned", {
    actor,
    reason: "Prepared a reversible experiment and typed execution handoff",
    now,
    addArtifacts: { plan: evidenceRefs, rollback: evidenceRefs },
    appendResearch: { experiments: [experiment], executionHandoffs: [executionHandoff] },
  });

  return {
    diagnosed,
    researched,
    decided,
    planned,
    records: {
      brief,
      plan,
      queries,
      sources,
      claims,
      contradictions,
      opportunities,
      decision,
      experiment,
      executionHandoff,
    },
  };
}
