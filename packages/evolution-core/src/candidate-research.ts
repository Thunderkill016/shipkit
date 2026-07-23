import { createHash } from "node:crypto";
import { evaluatePreparedResearch, assertResearchReviewPassed } from "./research-review.js";
import { prepareResearchToExecution, type ResearchBundleInput } from "./research.js";
import { transitionCycle } from "./state-machine.js";
import type {
  EvolutionCycle,
  ResearchBrief,
  ResearchBudget,
  ResearchEvaluationRecord,
  ResearchPlan,
  ResearchRunRecord,
} from "./types.js";

export type CandidateEvidenceKind = "issue" | "roadmap" | "capability" | "implementation";
export type CandidateStatus = "completed" | "active" | "planned" | "blocked";
export type CandidateExecutionBackend = "trusted-local" | "docker" | "none";

export type CandidateEvidenceInput = {
  kind: CandidateEvidenceKind;
  canonicalId: string;
  title: string;
  uri: string | null;
  version: string | null;
  observedAt: string;
  statement: string;
  capabilityId: string | null;
  expectedStatus: string | null;
  expectedVerificationStatus: string | null;
};

export type CandidateDecisionInput = {
  id: string;
  title: string;
  status: CandidateStatus;
  problem: string;
  expectedOutcome: string;
  priority: {
    pilotRelevance: number;
    decisionImpact: number;
    riskReduction: number;
    effort: number;
  };
  evidence: CandidateEvidenceInput[];
  alternatives: string[];
  smallestExperiment: string;
  hypothesis: string;
  allowedScope: string[];
  acceptanceCriteria: string[];
  verificationPlan: string[];
  rollbackPlan: string[];
};

export type ProtectedExperiment = {
  name: string;
  sourceUri: string;
  parameters: Record<string, string | number | boolean>;
  successCriteria: string[];
  failureCriteria: string[];
};

export type CandidateDecisionManifest = {
  schemaVersion: 1;
  decisionQuestion: string;
  executionBackend: CandidateExecutionBackend;
  protectedConstraints: string[];
  protectedExperiment: ProtectedExperiment | null;
  budget: Partial<ResearchBudget>;
  candidates: CandidateDecisionInput[];
};

export type CapabilityRegistryEntry = {
  id: string;
  status: string;
  verificationStatus: string;
  summary: string;
  evidence: string[];
  checks: string[];
  limitations: string[];
};

export type CapabilityRegistrySnapshot = {
  schemaVersion: number;
  project: string;
  lastVerified: string;
  capabilities: CapabilityRegistryEntry[];
};

export type CandidateResearchOptions = {
  actor: string;
  reviewerActor: string;
  now?: string;
  startedAt?: string;
  budget?: Partial<ResearchBudget>;
  evidenceRefs: {
    manifest: string;
    capabilities: string;
  };
};

export type CompletedCandidateResearch = {
  outcome: "completed";
  manifest: CandidateDecisionManifest;
  bundle: ResearchBundleInput;
  diagnosed: EvolutionCycle;
  researched: EvolutionCycle;
  decided: EvolutionCycle;
  planned: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  records: ReturnType<typeof prepareResearchToExecution>["records"];
  scores: Array<{ candidateId: string; rawScore: number; selectionScore: number }>;
};

export type InconclusiveCandidateResearch = {
  outcome: "inconclusive";
  reason: string;
  manifest: CandidateDecisionManifest;
  diagnosed: EvolutionCycle;
  inconclusive: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
};

export type CandidateResearchPreparation =
  | CompletedCandidateResearch
  | InconclusiveCandidateResearch;

const EVIDENCE_KINDS: CandidateEvidenceKind[] = [
  "issue",
  "roadmap",
  "capability",
  "implementation",
];
const STATUSES: CandidateStatus[] = ["completed", "active", "planned", "blocked"];
const BACKENDS: CandidateExecutionBackend[] = ["trusted-local", "docker", "none"];

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
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

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function dateValue(value: unknown, label: string): string {
  const normalized = stringValue(value, label);
  if (!Number.isFinite(Date.parse(normalized))) throw new Error(`${label} must be an ISO-compatible date`);
  return normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recordId(kind: string, cycleId: string, payload: unknown): string {
  return `${kind}:${hash({ kind, cycleId, payload }).slice(0, 24)}`;
}

function parseScalarParameters(value: unknown, label: string): Record<string, string | number | boolean> {
  const raw = object(value, label);
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(raw)) {
    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
      throw new Error(`${label}.${key} must be a string, number, or boolean`);
    }
    result[key] = item;
  }
  return result;
}

export function parseCandidateDecisionManifest(value: unknown): CandidateDecisionManifest {
  const raw = object(value, "candidate decision manifest");
  if (raw.schemaVersion !== 1) throw new Error("candidate decision manifest schemaVersion must be 1");
  const backend = stringValue(raw.executionBackend, "executionBackend") as CandidateExecutionBackend;
  if (!BACKENDS.includes(backend)) throw new Error("executionBackend is invalid");
  if (!Array.isArray(raw.candidates) || raw.candidates.length < 3) {
    throw new Error("candidate decision manifest requires at least three candidates");
  }

  const ids = new Set<string>();
  const candidates = raw.candidates.map((entry, candidateIndex) => {
    const candidate = object(entry, `candidates[${candidateIndex}]`);
    const id = stringValue(candidate.id, `candidates[${candidateIndex}].id`);
    if (ids.has(id)) throw new Error(`duplicate candidate id: ${id}`);
    ids.add(id);
    const status = stringValue(candidate.status, `candidates[${candidateIndex}].status`) as CandidateStatus;
    if (!STATUSES.includes(status)) throw new Error(`candidates[${candidateIndex}].status is invalid`);
    const priority = object(candidate.priority, `candidates[${candidateIndex}].priority`);
    if (!Array.isArray(candidate.evidence)) {
      throw new Error(`candidates[${candidateIndex}].evidence must be an array`);
    }
    const evidence = candidate.evidence.map((item, evidenceIndex) => {
      const source = object(item, `candidates[${candidateIndex}].evidence[${evidenceIndex}]`);
      const kind = stringValue(
        source.kind,
        `candidates[${candidateIndex}].evidence[${evidenceIndex}].kind`
      ) as CandidateEvidenceKind;
      if (!EVIDENCE_KINDS.includes(kind)) {
        throw new Error(`candidates[${candidateIndex}].evidence[${evidenceIndex}].kind is invalid`);
      }
      const capabilityId = optionalString(
        source.capabilityId,
        `candidates[${candidateIndex}].evidence[${evidenceIndex}].capabilityId`
      );
      if (kind === "capability" && !capabilityId) {
        throw new Error(`capability evidence for ${id} requires capabilityId`);
      }
      return {
        kind,
        canonicalId: stringValue(
          source.canonicalId,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].canonicalId`
        ),
        title: stringValue(
          source.title,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].title`
        ),
        uri: optionalString(
          source.uri,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].uri`
        ),
        version: optionalString(
          source.version,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].version`
        ),
        observedAt: dateValue(
          source.observedAt,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].observedAt`
        ),
        statement: stringValue(
          source.statement,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].statement`
        ),
        capabilityId,
        expectedStatus: optionalString(
          source.expectedStatus,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].expectedStatus`
        ),
        expectedVerificationStatus: optionalString(
          source.expectedVerificationStatus,
          `candidates[${candidateIndex}].evidence[${evidenceIndex}].expectedVerificationStatus`
        ),
      };
    });

    return {
      id,
      title: stringValue(candidate.title, `candidates[${candidateIndex}].title`),
      status,
      problem: stringValue(candidate.problem, `candidates[${candidateIndex}].problem`),
      expectedOutcome: stringValue(
        candidate.expectedOutcome,
        `candidates[${candidateIndex}].expectedOutcome`
      ),
      priority: {
        pilotRelevance: integer(
          priority.pilotRelevance,
          `candidates[${candidateIndex}].priority.pilotRelevance`,
          0,
          5
        ),
        decisionImpact: integer(
          priority.decisionImpact,
          `candidates[${candidateIndex}].priority.decisionImpact`,
          0,
          5
        ),
        riskReduction: integer(
          priority.riskReduction,
          `candidates[${candidateIndex}].priority.riskReduction`,
          0,
          5
        ),
        effort: integer(priority.effort, `candidates[${candidateIndex}].priority.effort`, 1, 5),
      },
      evidence,
      alternatives: stringArray(candidate.alternatives, `candidates[${candidateIndex}].alternatives`),
      smallestExperiment: stringValue(
        candidate.smallestExperiment,
        `candidates[${candidateIndex}].smallestExperiment`
      ),
      hypothesis: stringValue(candidate.hypothesis, `candidates[${candidateIndex}].hypothesis`),
      allowedScope: stringArray(
        candidate.allowedScope,
        `candidates[${candidateIndex}].allowedScope`,
        1
      ),
      acceptanceCriteria: stringArray(
        candidate.acceptanceCriteria,
        `candidates[${candidateIndex}].acceptanceCriteria`,
        1
      ),
      verificationPlan: stringArray(
        candidate.verificationPlan,
        `candidates[${candidateIndex}].verificationPlan`,
        1
      ),
      rollbackPlan: stringArray(
        candidate.rollbackPlan,
        `candidates[${candidateIndex}].rollbackPlan`,
        1
      ),
    };
  });

  let protectedExperiment: ProtectedExperiment | null = null;
  if (raw.protectedExperiment !== undefined && raw.protectedExperiment !== null) {
    const experiment = object(raw.protectedExperiment, "protectedExperiment");
    protectedExperiment = {
      name: stringValue(experiment.name, "protectedExperiment.name"),
      sourceUri: stringValue(experiment.sourceUri, "protectedExperiment.sourceUri"),
      parameters: parseScalarParameters(experiment.parameters, "protectedExperiment.parameters"),
      successCriteria: stringArray(
        experiment.successCriteria,
        "protectedExperiment.successCriteria",
        1
      ),
      failureCriteria: stringArray(
        experiment.failureCriteria,
        "protectedExperiment.failureCriteria",
        1
      ),
    };
  }

  const rawBudget = raw.budget === undefined ? {} : object(raw.budget, "budget");
  const budget: Partial<ResearchBudget> = {};
  for (const key of ["maxQueries", "maxSources", "maxMinutes"] as const) {
    if (rawBudget[key] !== undefined) budget[key] = integer(rawBudget[key], `budget.${key}`, 1, 10_000);
  }
  if (rawBudget.maxCostUsd !== undefined) {
    if (
      typeof rawBudget.maxCostUsd !== "number" ||
      !Number.isFinite(rawBudget.maxCostUsd) ||
      rawBudget.maxCostUsd < 0
    ) {
      throw new Error("budget.maxCostUsd must be a non-negative number");
    }
    budget.maxCostUsd = rawBudget.maxCostUsd;
  }

  return {
    schemaVersion: 1,
    decisionQuestion: stringValue(raw.decisionQuestion, "decisionQuestion"),
    executionBackend: backend,
    protectedConstraints: stringArray(raw.protectedConstraints, "protectedConstraints"),
    protectedExperiment,
    budget,
    candidates,
  };
}

export function parseCapabilityRegistry(value: unknown): CapabilityRegistrySnapshot {
  const raw = object(value, "capability registry");
  if (!Array.isArray(raw.capabilities)) throw new Error("capability registry capabilities must be an array");
  return {
    schemaVersion: integer(raw.schemaVersion, "capability registry schemaVersion", 1, 10_000),
    project: stringValue(raw.project, "capability registry project"),
    lastVerified: dateValue(raw.lastVerified, "capability registry lastVerified"),
    capabilities: raw.capabilities.map((entry, index) => {
      const capability = object(entry, `capabilities[${index}]`);
      return {
        id: stringValue(capability.id, `capabilities[${index}].id`),
        status: stringValue(capability.status, `capabilities[${index}].status`),
        verificationStatus: stringValue(
          capability.verificationStatus,
          `capabilities[${index}].verificationStatus`
        ),
        summary: stringValue(capability.summary, `capabilities[${index}].summary`),
        evidence: stringArray(capability.evidence, `capabilities[${index}].evidence`),
        checks: stringArray(capability.checks, `capabilities[${index}].checks`),
        limitations: stringArray(capability.limitations, `capabilities[${index}].limitations`),
      };
    }),
  };
}

function normalizeBudget(input: Partial<ResearchBudget>, candidates: number): ResearchBudget {
  const maxQueries = input.maxQueries ?? candidates + 1;
  const maxSources = input.maxSources ?? Math.max(12, candidates * 5);
  const maxMinutes = input.maxMinutes ?? 15;
  const maxCostUsd = input.maxCostUsd ?? 0;
  if (![maxQueries, maxSources, maxMinutes].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error("candidate research integer budgets must be positive");
  }
  if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
    throw new Error("candidate research maxCostUsd must be non-negative");
  }
  return { maxQueries, maxSources, maxMinutes, maxCostUsd };
}

function minutesBetween(startedAt: string, completedAt: string): number {
  const difference = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  return Math.max(1, Math.ceil(difference / 60_000));
}

function createRun(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  startedAt: string;
  budget: ResearchBudget;
  required: string[];
  answered: string[];
  gaps: string[];
  stopReason: string;
  outcome: ResearchRunRecord["outcome"];
  queries: number;
  sources: number;
  evidenceRefs: string[];
}): ResearchRunRecord {
  const payload = {
    adapter: "candidate-manifest" as const,
    startedAt: input.startedAt,
    completedAt: input.now,
    budget: input.budget,
    usage: {
      queries: input.queries,
      sources: input.sources,
      minutes: minutesBetween(input.startedAt, input.now),
      costUsd: 0,
    },
    coverage: { required: input.required, answered: input.answered, gaps: input.gaps },
    stopReason: input.stopReason,
    outcome: input.outcome,
  };
  return {
    recordId: recordId("research-run", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-run",
    ...payload,
  };
}

function protectedExperimentLines(experiment: ProtectedExperiment | null): string[] {
  if (!experiment) return [];
  return [
    `Protected experiment ${experiment.name} from ${experiment.sourceUri}.`,
    `Protected parameters: ${JSON.stringify(experiment.parameters)}.`,
    ...experiment.successCriteria.map((item) => `Protected success criterion: ${item}`),
    ...experiment.failureCriteria.map((item) => `Protected failure criterion: ${item}`),
  ];
}

function backendCapabilityIds(backend: CandidateExecutionBackend): string[] {
  if (backend === "trusted-local") {
    return ["temporary-workspace-assessment", "sandboxed-agent-execution"];
  }
  if (backend === "docker") return ["sandboxed-agent-execution"];
  return [];
}

function backendStatement(
  backend: CandidateExecutionBackend,
  capabilityById: Map<string, CapabilityRegistryEntry>
): string {
  if (backend === "none") {
    return "No execution backend is selected for this decision; research must not infer execution containment.";
  }
  if (backend === "trusted-local") {
    const local = capabilityById.get("temporary-workspace-assessment");
    const docker = capabilityById.get("sandboxed-agent-execution");
    return `The selected path is trusted-local and is not a security sandbox. The current registry reports temporary-workspace-assessment=${local?.status ?? "missing"}/${local?.verificationStatus ?? "missing"} and a separate Docker baseline sandboxed-agent-execution=${docker?.status ?? "missing"}/${docker?.verificationStatus ?? "missing"}.`;
  }
  const docker = capabilityById.get("sandboxed-agent-execution");
  return `The selected path is Docker. The current registry reports sandboxed-agent-execution=${docker?.status ?? "missing"}/${docker?.verificationStatus ?? "missing"}; its recorded limitations remain in force.`;
}

function candidateRawScore(candidate: CandidateDecisionInput): number {
  return (
    candidate.priority.pilotRelevance * 4 +
    candidate.priority.decisionImpact * 3 +
    candidate.priority.riskReduction * 2 -
    candidate.priority.effort
  );
}

function coverageReason(
  manifest: CandidateDecisionManifest,
  registry: CapabilityRegistrySnapshot,
  budget: ResearchBudget
): string | null {
  const capabilityById = new Map(registry.capabilities.map((item) => [item.id, item]));
  for (const candidate of manifest.candidates) {
    const kinds = new Set(candidate.evidence.map((item) => item.kind));
    const missing = EVIDENCE_KINDS.filter((kind) => !kinds.has(kind));
    if (missing.length > 0) {
      return `Candidate ${candidate.id} is missing required evidence categories: ${missing.join(", ")}.`;
    }
    for (const evidence of candidate.evidence.filter((item) => item.kind === "capability")) {
      const capability = capabilityById.get(evidence.capabilityId!);
      if (!capability) return `Candidate ${candidate.id} references missing capability ${evidence.capabilityId}.`;
      if (evidence.expectedStatus && evidence.expectedStatus !== capability.status) {
        return `Stale capability assertion for ${evidence.capabilityId}: expected status ${evidence.expectedStatus}, current status ${capability.status}.`;
      }
      if (
        evidence.expectedVerificationStatus &&
        evidence.expectedVerificationStatus !== capability.verificationStatus
      ) {
        return `Stale capability assertion for ${evidence.capabilityId}: expected verification ${evidence.expectedVerificationStatus}, current verification ${capability.verificationStatus}.`;
      }
    }
  }

  for (const capabilityId of backendCapabilityIds(manifest.executionBackend)) {
    const capability = capabilityById.get(capabilityId);
    if (!capability) return `Execution backend ${manifest.executionBackend} requires missing capability ${capabilityId}.`;
    if (capability.verificationStatus !== "passing") {
      return `Execution backend ${manifest.executionBackend} capability ${capabilityId} is not verified passing.`;
    }
  }

  if (budget.maxQueries < manifest.candidates.length + 1) {
    return `Query budget ${budget.maxQueries} cannot cover ${manifest.candidates.length} candidates plus backend verification.`;
  }

  const sourceIds = new Set(
    manifest.candidates.flatMap((candidate) => candidate.evidence.map((item) => item.canonicalId))
  );
  for (const id of backendCapabilityIds(manifest.executionBackend)) sourceIds.add(`capability:${id}`);
  if (budget.maxSources < sourceIds.size) {
    return `Source budget ${budget.maxSources} cannot cover ${sourceIds.size} required candidate sources.`;
  }

  const eligible = manifest.candidates.filter((candidate) => candidate.status !== "completed");
  if (eligible.length === 0) return "All named candidates are already completed.";
  const scores = eligible.map((candidate) => candidateRawScore(candidate));
  const highest = Math.max(...scores);
  if (scores.filter((score) => score === highest).length !== 1) {
    return `Candidate priority is tied at score ${highest}; the adapter cannot explain a unique ranking.`;
  }
  return null;
}

function createInconclusiveRecords(input: {
  cycle: EvolutionCycle;
  manifest: CandidateDecisionManifest;
  actor: string;
  reviewerActor: string;
  now: string;
  startedAt: string;
  budget: ResearchBudget;
  reason: string;
  evidenceRefs: string[];
}): InconclusiveCandidateResearch {
  const required = [
    ...input.manifest.candidates.map((candidate) => `Evidence coverage for candidate ${candidate.id}`),
    `Execution backend ${input.manifest.executionBackend} capability state`,
    "Protected constraints remain unchanged",
  ];
  const briefPayload = {
    decisionQuestion: input.manifest.decisionQuestion,
    owner: input.actor,
    deadline: null,
    assumptions: ["Candidate priority inputs are typed judgments and require explicit source coverage."],
    constraints: [...input.manifest.protectedConstraints, ...protectedExperimentLines(input.manifest.protectedExperiment)],
    evidenceThreshold:
      "Every named candidate requires issue, roadmap, capability and implementation evidence from the supplied snapshots.",
    protectedOutcomes: ["Do not invent missing candidate evidence.", "Do not overwrite precommitted experiment parameters."],
  };
  const brief: ResearchBrief = {
    recordId: recordId("research-brief", input.cycle.cycleId, briefPayload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: input.evidenceRefs,
    kind: "research-brief",
    ...briefPayload,
  };
  const planPayload = {
    briefId: brief.recordId,
    questions: required,
    sourceStrategy: ["Explicit candidate manifest", "Current capability registry snapshot"],
    budget: input.budget,
    stopConditions: [
      "Return inconclusive when any candidate lacks required evidence.",
      "Return inconclusive when capability expectations are stale.",
      "Return inconclusive when deterministic scoring does not produce a unique leader.",
    ],
  };
  const plan: ResearchPlan = {
    recordId: recordId("research-plan", input.cycle.cycleId, planPayload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: input.evidenceRefs,
    kind: "research-plan",
    ...planPayload,
  };
  const run = createRun({
    cycle: input.cycle,
    actor: input.actor,
    now: input.now,
    startedAt: input.startedAt,
    budget: input.budget,
    required,
    answered: [],
    gaps: required,
    stopReason: input.reason,
    outcome: "inconclusive",
    queries: 0,
    sources: 0,
    evidenceRefs: input.evidenceRefs,
  });
  const evaluationPayload = {
    researcherActor: input.actor,
    verdict: "inconclusive" as const,
    checks: [
      {
        id: "separate-reviewer" as const,
        passed: input.actor !== input.reviewerActor,
        summary: "Reviewer and researcher actors must remain separate.",
        evidenceRefs: [],
      },
      {
        id: "source-support" as const,
        passed: false,
        summary: input.reason,
        evidenceRefs: input.evidenceRefs,
      },
      {
        id: "stop-reason" as const,
        passed: true,
        summary: `Research stopped because: ${input.reason}`,
        evidenceRefs: input.evidenceRefs,
      },
    ],
    unsupportedClaimIds: [],
    unresolvedContradictionIds: [],
    stopReason: input.reason,
    limitations: ["The named-candidate evidence map did not support a unique current ranking."],
  };
  const evaluation: ResearchEvaluationRecord = {
    recordId: recordId("research-evaluation", input.cycle.cycleId, evaluationPayload),
    cycleId: input.cycle.cycleId,
    actor: input.reviewerActor,
    createdAt: input.now,
    evidenceRefs: input.evidenceRefs,
    kind: "research-evaluation",
    ...evaluationPayload,
  };
  const diagnosed = transitionCycle(input.cycle, "diagnosed", {
    actor: input.actor,
    reason: "Framed named-candidate research but could not complete the required current evidence map",
    now: input.now,
    addArtifacts: { diagnosis: input.evidenceRefs, candidates: input.evidenceRefs },
    appendResearch: { briefs: [brief], plans: [plan], runs: [run] },
  });
  const inconclusive = transitionCycle(diagnosed, "inconclusive", {
    actor: input.reviewerActor,
    reason: input.reason,
    now: input.now,
    addArtifacts: { research: input.evidenceRefs },
    appendResearch: { evaluations: [evaluation] },
  });
  return {
    outcome: "inconclusive",
    reason: input.reason,
    manifest: input.manifest,
    diagnosed,
    inconclusive,
    run,
    evaluation,
  };
}

function createBundle(
  cycle: EvolutionCycle,
  manifest: CandidateDecisionManifest,
  registry: CapabilityRegistrySnapshot,
  budget: ResearchBudget,
  evidenceRefs: CandidateResearchOptions["evidenceRefs"]
): {
  bundle: ResearchBundleInput;
  scores: Array<{ candidateId: string; rawScore: number; selectionScore: number }>;
} {
  const capabilityById = new Map(registry.capabilities.map((item) => [item.id, item]));
  const sources: ResearchBundleInput["sources"] = [];
  const sourceIndexByCanonicalId = new Map<string, number>();
  const sourceIndexesByCandidate = new Map<string, number[]>();

  function addSource(candidateId: string, evidence: CandidateEvidenceInput): number {
    const capability = evidence.capabilityId ? capabilityById.get(evidence.capabilityId) : null;
    const canonicalId = capability
      ? `capability:${capability.id}:${registry.lastVerified}`
      : evidence.canonicalId;
    const existing = sourceIndexByCanonicalId.get(canonicalId);
    if (existing !== undefined) {
      sourceIndexesByCandidate.set(candidateId, uniqueNumbers([...(sourceIndexesByCandidate.get(candidateId) ?? []), existing]));
      return existing;
    }
    const index = sources.length;
    sources.push({
      canonicalId,
      title: capability ? `Capability ${capability.id}` : evidence.title,
      publisher: capability ? `${registry.project} capability registry` : "Candidate decision manifest",
      sourceClass: "repository",
      version: capability ? registry.lastVerified : evidence.version,
      accessedAt: capability ? registry.lastVerified : evidence.observedAt,
      license: null,
      authority: evidence.kind === "implementation" ? 0.95 : evidence.kind === "capability" ? 0.9 : 0.8,
      directness: evidence.kind === "implementation" ? 0.95 : 0.85,
      freshness: 1,
      applicability: 1,
      independence: 0.2,
      conflictOfInterest:
        "The source is supplied by the project and may not provide independent external corroboration.",
      evidenceRefs: [capability ? evidenceRefs.capabilities : evidenceRefs.manifest],
    });
    sourceIndexByCanonicalId.set(canonicalId, index);
    sourceIndexesByCandidate.set(candidateId, uniqueNumbers([...(sourceIndexesByCandidate.get(candidateId) ?? []), index]));
    return index;
  }

  for (const candidate of manifest.candidates) {
    for (const evidence of candidate.evidence) addSource(candidate.id, evidence);
  }
  for (const capabilityId of backendCapabilityIds(manifest.executionBackend)) {
    const capability = capabilityById.get(capabilityId)!;
    addSource("__backend__", {
      kind: "capability",
      canonicalId: `capability:${capabilityId}`,
      title: `Capability ${capabilityId}`,
      uri: null,
      version: registry.lastVerified,
      observedAt: registry.lastVerified,
      statement: capability.summary,
      capabilityId,
      expectedStatus: capability.status,
      expectedVerificationStatus: capability.verificationStatus,
    });
  }

  const claims: ResearchBundleInput["claims"] = [];
  const claimIndexesByCandidate = new Map<string, number[]>();
  const statusClaimByCandidate = new Map<string, number>();
  const priorityClaimByCandidate = new Map<string, number>();

  for (const candidate of manifest.candidates) {
    const indexes: number[] = [];
    for (const evidence of candidate.evidence) {
      const sourceIndex = addSource(candidate.id, evidence);
      const capability = evidence.capabilityId ? capabilityById.get(evidence.capabilityId) : null;
      const statement = capability
        ? `Capability ${capability.id} is ${capability.status}/${capability.verificationStatus}: ${capability.summary}`
        : evidence.statement;
      indexes.push(claims.length);
      claims.push({
        statement: `[${candidate.id}] ${statement}`,
        claimType: evidence.kind === "capability" ? "fact" : "mechanism",
        confidence: evidence.kind === "implementation" || evidence.kind === "capability" ? 0.95 : 0.85,
        uncertainty: "The supplied project snapshot may omit external user or market evidence.",
        supportingSourceIndexes: [sourceIndex],
        contradictingSourceIndexes: [],
        expiresAt: null,
      });
    }
    const candidateSources = sourceIndexesByCandidate.get(candidate.id) ?? [];
    const statusIndex = claims.length;
    claims.push({
      statement: `[${candidate.id}] Candidate status is ${candidate.status}.`,
      claimType: "fact",
      confidence: 0.95,
      uncertainty: "Status is sourced from the explicit candidate manifest and may require refresh.",
      supportingSourceIndexes: candidateSources,
      contradictingSourceIndexes: [],
      expiresAt: null,
    });
    indexes.push(statusIndex);
    statusClaimByCandidate.set(candidate.id, statusIndex);

    const rawScore = candidateRawScore(candidate);
    const selectionScore = candidate.status === "completed" ? -1000 : rawScore;
    const priorityIndex = claims.length;
    claims.push({
      statement: `[${candidate.id}] Deterministic priority score is ${selectionScore} (raw ${rawScore}) from pilotRelevance=${candidate.priority.pilotRelevance}, decisionImpact=${candidate.priority.decisionImpact}, riskReduction=${candidate.priority.riskReduction}, effort=${candidate.priority.effort}.`,
      claimType: "recommendation",
      confidence: 0.8,
      uncertainty: "The score explains manifest inputs; it does not estimate product-market prevalence.",
      supportingSourceIndexes: candidateSources,
      contradictingSourceIndexes: [],
      expiresAt: null,
    });
    indexes.push(priorityIndex);
    priorityClaimByCandidate.set(candidate.id, priorityIndex);
    claimIndexesByCandidate.set(candidate.id, indexes);
  }

  const backendSourceIndexes = sourceIndexesByCandidate.get("__backend__") ?? [];
  const backendClaimIndex = claims.length;
  claims.push({
    statement: backendStatement(manifest.executionBackend, capabilityById),
    claimType: manifest.executionBackend === "none" ? "limitation" : "fact",
    confidence: 0.98,
    uncertainty: "Capability registry limits and the explicitly selected execution path remain authoritative.",
    supportingSourceIndexes: backendSourceIndexes.length > 0 ? backendSourceIndexes : [0],
    contradictingSourceIndexes: [],
    expiresAt: null,
  });

  const scores = manifest.candidates.map((candidate) => {
    const rawScore = candidateRawScore(candidate);
    return {
      candidateId: candidate.id,
      rawScore,
      selectionScore: candidate.status === "completed" ? -1000 : rawScore,
    };
  });
  const selectedScore = Math.max(...scores.map((item) => item.selectionScore));
  const selectedIndex = scores.findIndex((item) => item.selectionScore === selectedScore);
  const selected = manifest.candidates[selectedIndex]!;

  const opportunities: ResearchBundleInput["opportunities"] = manifest.candidates.map((candidate) => ({
    title: `${candidate.id}: ${candidate.title}`,
    problem: candidate.problem,
    expectedOutcome: candidate.expectedOutcome,
    evidenceClaimIndexes: uniqueNumbers([...(claimIndexesByCandidate.get(candidate.id) ?? []), backendClaimIndex]),
    alternatives: candidate.alternatives,
    estimatedCost: `effort-${candidate.priority.effort}-of-5`,
    risk: `risk-reduction-${candidate.priority.riskReduction}-of-5`,
    uncertainty:
      "Candidate ranking is bounded to the supplied issue, roadmap, capability and implementation snapshots.",
    learningValue: `Decision impact ${candidate.priority.decisionImpact}/5 with pilot relevance ${candidate.priority.pilotRelevance}/5.`,
    smallestExperiment: candidate.smallestExperiment,
  }));

  const contradictions: ResearchBundleInput["contradictions"] = [];
  for (const candidate of manifest.candidates) {
    if (candidate.status === "completed" && candidateRawScore(candidate) > 0) {
      contradictions.push({
        claimIndexes: [statusClaimByCandidate.get(candidate.id)!, priorityClaimByCandidate.get(candidate.id)!],
        summary: `${candidate.id} retains positive priority signals but is already completed and must not be selected again.`,
        suspectedCause: "Historical priority inputs remain informative after delivery status changed.",
        affectedDecision: `Whether ${candidate.id} can be selected as the next workstream.`,
        status: "resolved",
      });
    }
  }

  const protectedLines = protectedExperimentLines(manifest.protectedExperiment);
  const requiredQuestions = [
    ...manifest.candidates.map((candidate) => `What current evidence supports candidate ${candidate.id}?`),
    `What does the current capability registry say about backend ${manifest.executionBackend}?`,
    "Which precommitted constraints and experiment parameters must remain unchanged?",
  ];

  return {
    scores,
    bundle: {
      brief: {
        decisionQuestion: manifest.decisionQuestion,
        owner: "shipkit-candidate-researcher",
        deadline: null,
        assumptions: [
          "Priority signals are typed judgments supplied in the manifest and remain inspectable.",
          "Repository and capability evidence cannot establish user demand without direct user evidence.",
        ],
        constraints: [...manifest.protectedConstraints, ...protectedLines],
        evidenceThreshold:
          "Every candidate must link issue, roadmap, current capability and implementation evidence; stale capability assertions fail closed.",
        protectedOutcomes: [
          "Do not invent missing candidate evidence.",
          "Do not replace precommitted pilot parameters with generated defaults.",
          "Do not merge, deploy, spend, or write production data.",
        ],
      },
      plan: {
        questions: requiredQuestions,
        sourceStrategy: [
          "Explicit named-candidate issue snapshots",
          "Repository roadmap and implementation references",
          "Current capability registry rather than copied capability prose",
        ],
        budget,
        stopConditions: [
          "Stop when every named candidate has all four required evidence categories.",
          "Return inconclusive on stale capability expectations or a tied ranking.",
          "Stop when remaining uncertainty requires direct user or external evidence.",
        ],
      },
      queries: [
        ...manifest.candidates.map((candidate) => ({
          query: `candidate ${candidate.id}: issue roadmap capability implementation evidence`,
          rationale: `Ground the named alternative ${candidate.id} without substituting a generic opportunity.`,
          tool: "candidate-manifest",
          parentQueryIndex: null,
          resultRefs: candidate.evidence.map((item) => item.canonicalId),
        })),
        {
          query: `execution backend ${manifest.executionBackend} current capability state`,
          rationale: "Derive sandbox statements from the selected path and current capability registry.",
          tool: "capability-registry",
          parentQueryIndex: null,
          resultRefs: backendCapabilityIds(manifest.executionBackend).map((id) => `capability:${id}`),
        },
      ],
      sources,
      claims,
      contradictions,
      opportunities,
      decision: {
        selectedOpportunityIndex: selectedIndex,
        rejectedOpportunityIndexes: manifest.candidates
          .map((_, index) => index)
          .filter((index) => index !== selectedIndex),
        rationale: `Selected ${selected.id} because it has the unique highest deterministic selection score ${selectedScore}; completed candidates are excluded and every rejected alternative remains inspectable.`,
      },
      experiment: {
        hypothesis: selected.hypothesis,
        method: selected.smallestExperiment,
        successCriteria: selected.acceptanceCriteria,
        guardrails: unique([
          ...manifest.protectedConstraints,
          ...protectedLines,
          "Do not claim external user decision value from this repository-only comparison.",
        ]),
        rollbackPlan: selected.rollbackPlan,
      },
      handoff: {
        allowedScope: selected.allowedScope,
        forbiddenScope: [
          "secrets",
          "production",
          "automatic merge",
          "automatic deploy",
          "precommitted pilot threshold changes",
        ],
        acceptanceCriteria: selected.acceptanceCriteria,
        verificationPlan: selected.verificationPlan,
        rollbackPlan: selected.rollbackPlan,
      },
    },
  };
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

export function prepareCandidateResearch(
  cycle: EvolutionCycle,
  rawManifest: unknown,
  rawCapabilityRegistry: unknown,
  options: CandidateResearchOptions
): CandidateResearchPreparation {
  if (cycle.stage !== "modeled") {
    throw new Error(`candidate research requires a modeled cycle; current stage is ${cycle.stage}`);
  }
  const actor = options.actor.trim();
  const reviewerActor = options.reviewerActor.trim();
  if (!actor || !reviewerActor) throw new Error("researcher and reviewer actors are required");
  if (actor === reviewerActor) throw new Error("reviewer actor must differ from researcher actor");

  const manifest = parseCandidateDecisionManifest(rawManifest);
  const registry = parseCapabilityRegistry(rawCapabilityRegistry);
  const now = options.now ?? new Date().toISOString();
  const startedAt = options.startedAt ?? now;
  const budget = normalizeBudget({ ...manifest.budget, ...options.budget }, manifest.candidates.length);
  const evidenceRefs = unique(Object.values(options.evidenceRefs));
  const reason = coverageReason(manifest, registry, budget);
  if (reason) {
    return createInconclusiveRecords({
      cycle,
      manifest,
      actor,
      reviewerActor,
      now,
      startedAt,
      budget,
      reason,
      evidenceRefs,
    });
  }

  const { bundle, scores } = createBundle(cycle, manifest, registry, budget, options.evidenceRefs);
  const prepared = prepareResearchToExecution(cycle, bundle, { actor, now, evidenceRefs });
  const required = bundle.plan.questions;
  const stopReason =
    "All named candidates were compared against explicit issue, roadmap, current capability and implementation evidence; remaining uncertainty requires direct user or external evidence.";
  const run = createRun({
    cycle,
    actor,
    now,
    startedAt,
    budget,
    required,
    answered: required,
    gaps: ["Direct external user decision evidence", "Independent external corroboration"],
    stopReason,
    outcome: "completed",
    queries: bundle.queries.length,
    sources: bundle.sources.length,
    evidenceRefs,
  });
  const researched = transitionCycle(prepared.diagnosed, "researched", {
    actor,
    reason: `Compared ${manifest.candidates.length} named candidates using ${bundle.sources.length} current sources`,
    now,
    addArtifacts: { research: evidenceRefs },
    appendResearch: {
      runs: [run],
      queries: prepared.records.queries,
      sources: prepared.records.sources,
      claims: prepared.records.claims,
      contradictions: prepared.records.contradictions,
      opportunities: prepared.records.opportunities,
    },
  });
  const evaluation = evaluatePreparedResearch(prepared, {
    reviewerActor,
    now,
    evidenceRefs,
    run,
  });
  assertResearchReviewPassed(evaluation);
  const decided = transitionCycle(researched, "decided", {
    actor: reviewerActor,
    reason: "Independent review accepted the candidate-specific evidence map and preserved rejected alternatives",
    now,
    addArtifacts: { decision: evidenceRefs },
    appendResearch: {
      evaluations: [evaluation],
      decisions: [prepared.records.decision],
    },
  });
  const planned = transitionCycle(decided, "planned", {
    actor,
    reason: "Prepared a reversible candidate-specific experiment without changing protected pilot parameters",
    now,
    addArtifacts: { plan: evidenceRefs, rollback: evidenceRefs },
    appendResearch: {
      experiments: [prepared.records.experiment],
      executionHandoffs: [prepared.records.executionHandoff],
    },
  });

  return {
    outcome: "completed",
    manifest,
    bundle,
    diagnosed: prepared.diagnosed,
    researched,
    decided,
    planned,
    run,
    evaluation,
    records: prepared.records,
    scores,
  };
}
