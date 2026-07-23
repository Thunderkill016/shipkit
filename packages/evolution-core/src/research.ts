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
    owner: string;
    deadline: string | null;
    assumptions: string[];
    constraints: string[];
    evidenceThreshold: string;
    protectedOutcomes: string[];
  };
  plan: {
    questions: string[];
    sourceStrategy: string[];
    budget: ResearchBudget;
    stopConditions: string[];
  };
  queries: Array<{
    query: string;
    rationale: string;
    tool: string;
    parentQueryIndex: number | null;
    resultRefs: string[];
  }>;
  sources: Array<{
    canonicalId: string;
    title: string;
    publisher: string;
    sourceClass: ResearchSourceClass;
    version: string | null;
    accessedAt: string;
    license: string | null;
    authority: number;
    directness: number;
    freshness: number;
    applicability: number;
    independence: number;
    conflictOfInterest: string | null;
    evidenceRefs: string[];
  }>;
  claims: Array<{
    statement: string;
    claimType: ResearchClaimType;
    confidence: number;
    uncertainty: string;
    supportingSourceIndexes: number[];
    contradictingSourceIndexes: number[];
    expiresAt: string | null;
  }>;
  contradictions: Array<{
    claimIndexes: number[];
    summary: string;
    suspectedCause: string;
    affectedDecision: string;
    status: ContradictionRecord["status"];
  }>;
  opportunities: Array<{
    title: string;
    problem: string;
    expectedOutcome: string;
    evidenceClaimIndexes: number[];
    alternatives: string[];
    estimatedCost: string;
    risk: string;
    uncertainty: string;
    learningValue: string;
    smallestExperiment: string;
  }>;
  decision: {
    selectedOpportunityIndex: number;
    rejectedOpportunityIndexes: number[];
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

const CONTRADICTION_STATES = new Set<ContradictionRecord["status"]>([
  "open",
  "resolved",
  "accepted-uncertainty",
]);

function object(value: unknown, label: string): Record<string, any> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, any>;
}

function stringValue(value: unknown, label: string, fallback?: string): string {
  if ((value === undefined || value === null || value === "") && fallback !== undefined) {
    return fallback;
  }
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function optionalString(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return stringValue(value, label);
}

function stringArray(value: unknown, label: string, minimum = 0): string[] {
  if (value === undefined && minimum === 0) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const normalized = [...new Set(value.map((item) => stringValue(item, label)))];
  if (normalized.length < minimum) throw new Error(`${label} requires at least ${minimum} item(s)`);
  return normalized;
}

function boundedNumber(value: unknown, label: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
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

function validIndex(value: unknown, label: string, length: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= length) {
    throw new Error(`${label} must reference an existing item`);
  }
  return value;
}

function indexArray(value: unknown, label: string, length: number, minimum = 0): number[] {
  if (value === undefined && minimum === 0) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const normalized = [...new Set(value.map((item) => validIndex(item, label, length)))];
  if (normalized.length < minimum) throw new Error(`${label} requires at least ${minimum} item(s)`);
  return normalized;
}

function dateValue(value: unknown, label: string, fallback: string | null): string | null {
  const normalized = optionalString(value, label) ?? fallback;
  if (normalized !== null && !Number.isFinite(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-compatible date`);
  }
  return normalized;
}

function recordId(kind: string, cycleId: string, position: number, payload: unknown): string {
  const hash = createHash("sha256")
    .update(JSON.stringify({ kind, cycleId, position, payload }))
    .digest("hex")
    .slice(0, 24);
  return `${kind}:${hash}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recordBase(
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
    evidenceRefs: [...new Set(evidenceRefs.map((reference) => reference.trim()).filter(Boolean))],
  };
}

export function parseResearchBundle(value: unknown): ResearchBundleInput {
  const raw = object(value, "research bundle");
  const brief = object(raw.brief, "brief");
  const plan = object(raw.plan, "plan");
  const decision = object(raw.decision, "decision");
  const experiment = object(raw.experiment, "experiment");
  const handoff = object(raw.handoff, "handoff");
  const rawQueries = Array.isArray(raw.queries) ? raw.queries : [];
  const rawSources = Array.isArray(raw.sources) ? raw.sources : [];
  const rawClaims = Array.isArray(raw.claims) ? raw.claims : [];
  const rawContradictions = Array.isArray(raw.contradictions) ? raw.contradictions : [];
  const rawOpportunities = Array.isArray(raw.opportunities) ? raw.opportunities : [];

  if (rawOpportunities.length < 3) {
    throw new Error("research bundle requires at least three opportunities");
  }

  const budget = object(plan.budget ?? {}, "plan.budget");
  const queries = rawQueries.map((entry, entryIndex) => {
    const item = object(entry, `queries[${entryIndex}]`);
    return {
      query: stringValue(item.query, `queries[${entryIndex}].query`),
      rationale: stringValue(item.rationale, `queries[${entryIndex}].rationale`),
      tool: stringValue(item.tool, `queries[${entryIndex}].tool`, "unspecified"),
      parentQueryIndex:
        item.parentQueryIndex === undefined || item.parentQueryIndex === null
          ? null
          : validIndex(item.parentQueryIndex, `queries[${entryIndex}].parentQueryIndex`, rawQueries.length),
      resultRefs: stringArray(item.resultRefs, `queries[${entryIndex}].resultRefs`),
    };
  });

  const now = new Date().toISOString();
  const sources = rawSources.map((entry, entryIndex) => {
    const item = object(entry, `sources[${entryIndex}]`);
    const sourceClass = stringValue(
      item.sourceClass,
      `sources[${entryIndex}].sourceClass`
    ) as ResearchSourceClass;
    if (!SOURCE_CLASSES.has(sourceClass)) {
      throw new Error(`sources[${entryIndex}].sourceClass is invalid`);
    }
    return {
      canonicalId: stringValue(item.canonicalId, `sources[${entryIndex}].canonicalId`),
      title: stringValue(item.title, `sources[${entryIndex}].title`),
      publisher: stringValue(item.publisher, `sources[${entryIndex}].publisher`),
      sourceClass,
      version: optionalString(item.version, `sources[${entryIndex}].version`),
      accessedAt: dateValue(item.accessedAt, `sources[${entryIndex}].accessedAt`, now)!,
      license: optionalString(item.license, `sources[${entryIndex}].license`),
      authority: boundedNumber(item.authority, `sources[${entryIndex}].authority`),
      directness: boundedNumber(item.directness, `sources[${entryIndex}].directness`),
      freshness: boundedNumber(item.freshness, `sources[${entryIndex}].freshness`),
      applicability: boundedNumber(item.applicability, `sources[${entryIndex}].applicability`),
      independence: boundedNumber(item.independence, `sources[${entryIndex}].independence`),
      conflictOfInterest: optionalString(
        item.conflictOfInterest,
        `sources[${entryIndex}].conflictOfInterest`
      ),
      evidenceRefs: stringArray(item.evidenceRefs, `sources[${entryIndex}].evidenceRefs`),
    };
  });

  const claims = rawClaims.map((entry, entryIndex) => {
    const item = object(entry, `claims[${entryIndex}]`);
    const claimType = stringValue(item.claimType, `claims[${entryIndex}].claimType`) as ResearchClaimType;
    if (!CLAIM_TYPES.has(claimType)) throw new Error(`claims[${entryIndex}].claimType is invalid`);
    return {
      statement: stringValue(item.statement, `claims[${entryIndex}].statement`),
      claimType,
      confidence: boundedNumber(item.confidence, `claims[${entryIndex}].confidence`),
      uncertainty: stringValue(item.uncertainty, `claims[${entryIndex}].uncertainty`),
      supportingSourceIndexes: indexArray(
        item.supportingSourceIndexes,
        `claims[${entryIndex}].supportingSourceIndexes`,
        sources.length,
        1
      ),
      contradictingSourceIndexes: indexArray(
        item.contradictingSourceIndexes,
        `claims[${entryIndex}].contradictingSourceIndexes`,
        sources.length
      ),
      expiresAt: dateValue(item.expiresAt, `claims[${entryIndex}].expiresAt`, null),
    };
  });

  const contradictions = rawContradictions.map((entry, entryIndex) => {
    const item = object(entry, `contradictions[${entryIndex}]`);
    const status = stringValue(
      item.status,
      `contradictions[${entryIndex}].status`,
      "open"
    ) as ContradictionRecord["status"];
    if (!CONTRADICTION_STATES.has(status)) {
      throw new Error(`contradictions[${entryIndex}].status is invalid`);
    }
    return {
      claimIndexes: indexArray(
        item.claimIndexes,
        `contradictions[${entryIndex}].claimIndexes`,
        claims.length,
        2
      ),
      summary: stringValue(item.summary, `contradictions[${entryIndex}].summary`),
      suspectedCause: stringValue(
        item.suspectedCause,
        `contradictions[${entryIndex}].suspectedCause`
      ),
      affectedDecision: stringValue(
        item.affectedDecision,
        `contradictions[${entryIndex}].affectedDecision`
      ),
      status,
    };
  });

  const opportunities = rawOpportunities.map((entry, entryIndex) => {
    const item = object(entry, `opportunities[${entryIndex}]`);
    return {
      title: stringValue(item.title, `opportunities[${entryIndex}].title`),
      problem: stringValue(item.problem, `opportunities[${entryIndex}].problem`),
      expectedOutcome: stringValue(
        item.expectedOutcome,
        `opportunities[${entryIndex}].expectedOutcome`
      ),
      evidenceClaimIndexes: indexArray(
        item.evidenceClaimIndexes,
        `opportunities[${entryIndex}].evidenceClaimIndexes`,
        claims.length,
        1
      ),
      alternatives: stringArray(item.alternatives, `opportunities[${entryIndex}].alternatives`),
      estimatedCost: stringValue(
        item.estimatedCost,
        `opportunities[${entryIndex}].estimatedCost`
      ),
      risk: stringValue(item.risk, `opportunities[${entryIndex}].risk`),
      uncertainty: stringValue(item.uncertainty, `opportunities[${entryIndex}].uncertainty`),
      learningValue: stringValue(
        item.learningValue,
        `opportunities[${entryIndex}].learningValue`
      ),
      smallestExperiment: stringValue(
        item.smallestExperiment,
        `opportunities[${entryIndex}].smallestExperiment`
      ),
    };
  });

  const selectedOpportunityIndex = validIndex(
    decision.selectedOpportunityIndex,
    "decision.selectedOpportunityIndex",
    opportunities.length
  );

  return {
    brief: {
      decisionQuestion: stringValue(brief.decisionQuestion, "brief.decisionQuestion"),
      owner: stringValue(brief.owner, "brief.owner", "unassigned"),
      deadline: dateValue(brief.deadline, "brief.deadline", null),
      assumptions: stringArray(brief.assumptions, "brief.assumptions"),
      constraints: stringArray(brief.constraints, "brief.constraints"),
      evidenceThreshold: stringValue(
        brief.evidenceThreshold,
        "brief.evidenceThreshold",
        "Material claims require direct evidence and visible uncertainty."
      ),
      protectedOutcomes: stringArray(brief.protectedOutcomes, "brief.protectedOutcomes"),
    },
    plan: {
      questions: stringArray(plan.questions, "plan.questions", 1),
      sourceStrategy: stringArray(plan.sourceStrategy, "plan.sourceStrategy", 1),
      budget: {
        maxQueries: positiveInteger(budget.maxQueries, "plan.budget.maxQueries", 20),
        maxSources: positiveInteger(budget.maxSources, "plan.budget.maxSources", 30),
        maxMinutes: positiveInteger(budget.maxMinutes, "plan.budget.maxMinutes", 60),
        maxCostUsd: nonNegativeNumber(budget.maxCostUsd, "plan.budget.maxCostUsd", 0),
      },
      stopConditions: stringArray(plan.stopConditions, "plan.stopConditions", 1),
    },
    queries,
    sources,
    claims,
    contradictions,
    opportunities,
    decision: {
      selectedOpportunityIndex,
      rejectedOpportunityIndexes: indexArray(
        decision.rejectedOpportunityIndexes ?? opportunities.map((_, itemIndex) => itemIndex).filter(
          (itemIndex) => itemIndex !== selectedOpportunityIndex
        ),
        "decision.rejectedOpportunityIndexes",
        opportunities.length
      ),
      rationale: stringValue(decision.rationale, "decision.rationale"),
    },
    experiment: {
      hypothesis: stringValue(experiment.hypothesis, "experiment.hypothesis"),
      method: stringValue(experiment.method, "experiment.method"),
      successCriteria: stringArray(experiment.successCriteria, "experiment.successCriteria", 1),
      guardrails: stringArray(experiment.guardrails, "experiment.guardrails", 1),
      rollbackPlan: stringArray(experiment.rollbackPlan, "experiment.rollbackPlan", 1),
    },
    handoff: {
      allowedScope: stringArray(handoff.allowedScope, "handoff.allowedScope", 1),
      forbiddenScope: stringArray(handoff.forbiddenScope, "handoff.forbiddenScope", 1),
      acceptanceCriteria: stringArray(
        handoff.acceptanceCriteria,
        "handoff.acceptanceCriteria",
        1
      ),
      verificationPlan: stringArray(handoff.verificationPlan, "handoff.verificationPlan", 1),
      rollbackPlan: stringArray(handoff.rollbackPlan, "handoff.rollbackPlan", 1),
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
  const actor = stringValue(options.actor, "actor");
  const evidenceRefs = stringArray(options.evidenceRefs, "evidenceRefs", 1);
  const bundle = parseResearchBundle(rawBundle);
  const now = options.now ?? new Date().toISOString();

  const brief: ResearchBrief = {
    ...recordBase("research-brief", cycle.cycleId, 0, bundle.brief, actor, now, evidenceRefs),
    kind: "research-brief",
    ...bundle.brief,
  };
  const plan: ResearchPlan = {
    ...recordBase("research-plan", cycle.cycleId, 0, bundle.plan, actor, now, evidenceRefs),
    kind: "research-plan",
    briefId: brief.recordId,
    ...bundle.plan,
  };

  const queries: QueryRecord[] = bundle.queries.map((entry, entryIndex, all) => ({
    ...recordBase("query", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "query",
    query: entry.query,
    rationale: entry.rationale,
    tool: entry.tool,
    parentQueryId:
      entry.parentQueryIndex === null
        ? null
        : recordId("query", cycle.cycleId, entry.parentQueryIndex, all[entry.parentQueryIndex]),
    resultRefs: entry.resultRefs,
  }));

  const sources: SourceRecord[] = bundle.sources.map((entry, entryIndex) => ({
    ...recordBase(
      "source",
      cycle.cycleId,
      entryIndex,
      entry,
      actor,
      now,
      [...evidenceRefs, ...entry.evidenceRefs]
    ),
    kind: "source",
    canonicalId: entry.canonicalId,
    title: entry.title,
    publisher: entry.publisher,
    sourceClass: entry.sourceClass,
    version: entry.version,
    accessedAt: entry.accessedAt,
    license: entry.license,
    authority: entry.authority,
    directness: entry.directness,
    freshness: entry.freshness,
    applicability: entry.applicability,
    independence: entry.independence,
    conflictOfInterest: entry.conflictOfInterest,
  }));

  const claims: ClaimRecord[] = bundle.claims.map((entry, entryIndex) => ({
    ...recordBase("claim", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "claim",
    statement: entry.statement,
    claimType: entry.claimType,
    confidence: entry.confidence,
    uncertainty: entry.uncertainty,
    supportingSourceIds: entry.supportingSourceIndexes.map(
      (sourceIndex) => sources[sourceIndex]!.recordId
    ),
    contradictingSourceIds: entry.contradictingSourceIndexes.map(
      (sourceIndex) => sources[sourceIndex]!.recordId
    ),
    expiresAt: entry.expiresAt,
  }));

  const contradictions: ContradictionRecord[] = bundle.contradictions.map(
    (entry, entryIndex) => ({
      ...recordBase("contradiction", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
      kind: "contradiction",
      claimIds: entry.claimIndexes.map((claimIndex) => claims[claimIndex]!.recordId),
      summary: entry.summary,
      suspectedCause: entry.suspectedCause,
      affectedDecision: entry.affectedDecision,
      status: entry.status,
    })
  );

  const opportunities: OpportunityRecord[] = bundle.opportunities.map((entry, entryIndex) => ({
    ...recordBase("opportunity", cycle.cycleId, entryIndex, entry, actor, now, evidenceRefs),
    kind: "opportunity",
    title: entry.title,
    problem: entry.problem,
    expectedOutcome: entry.expectedOutcome,
    evidenceClaimIds: entry.evidenceClaimIndexes.map(
      (claimIndex) => claims[claimIndex]!.recordId
    ),
    alternatives: entry.alternatives,
    estimatedCost: entry.estimatedCost,
    risk: entry.risk,
    uncertainty: entry.uncertainty,
    learningValue: entry.learningValue,
    smallestExperiment: entry.smallestExperiment,
  }));

  const selectedOpportunity = opportunities[bundle.decision.selectedOpportunityIndex]!;
  const decision: DecisionRecord = {
    ...recordBase("decision", cycle.cycleId, 0, bundle.decision, actor, now, evidenceRefs),
    kind: "decision",
    selectedOpportunityId: selectedOpportunity.recordId,
    rejectedOpportunityIds: bundle.decision.rejectedOpportunityIndexes
      .filter((opportunityIndex) => opportunityIndex !== bundle.decision.selectedOpportunityIndex)
      .map((opportunityIndex) => opportunities[opportunityIndex]!.recordId),
    rationale: bundle.decision.rationale,
  };

  const experimentRecord: ExperimentRecord = {
    ...recordBase("experiment", cycle.cycleId, 0, bundle.experiment, actor, now, evidenceRefs),
    kind: "experiment",
    decisionId: decision.recordId,
    hypothesis: bundle.experiment.hypothesis,
    method: bundle.experiment.method,
    successCriteria: bundle.experiment.successCriteria,
    guardrails: bundle.experiment.guardrails,
    rollbackPlan: bundle.experiment.rollbackPlan,
  };

  const handoffPayload = {
    experimentId: experimentRecord.recordId,
    objective: cycle.objective,
    ...bundle.handoff,
  };
  const executionHandoff: ExecutionHandoff = {
    ...recordBase("execution-handoff", cycle.cycleId, 0, handoffPayload, actor, now, evidenceRefs),
    kind: "execution-handoff",
    ...handoffPayload,
    parameterDigest: hash(handoffPayload),
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
    appendResearch: {
      experiments: [experimentRecord],
      executionHandoffs: [executionHandoff],
    },
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
      experiment: experimentRecord,
      executionHandoff,
    },
  };
}
