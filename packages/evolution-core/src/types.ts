export const EVOLUTION_STAGES = [
  "created",
  "observed",
  "modeled",
  "diagnosed",
  "researched",
  "decided",
  "planned",
  "executing",
  "implemented",
  "verified",
  "measured",
  "learned",
  "meta-improved",
  "completed",
  "rejected",
  "rolled-back",
  "inconclusive",
] as const;

export type EvolutionStage = (typeof EVOLUTION_STAGES)[number];

export const AUTONOMY_LEVELS = ["A0", "A1", "A2", "A3", "A4"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const RISK_CLASSES = ["R0", "R1", "R2", "R3", "R4"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const EVOLUTION_ACTIONS = [
  "inspect",
  "research",
  "plan",
  "record-memory",
  "run-checks",
  "modify-code",
  "open-draft-pr",
  "merge",
  "deploy",
  "production-write",
  "read-secrets",
  "spend",
] as const;

export type EvolutionAction = (typeof EVOLUTION_ACTIONS)[number];

export const EVOLUTION_POLICY_VERSION = 1 as const;

export type ArtifactBucket =
  | "baseline"
  | "model"
  | "diagnosis"
  | "research"
  | "candidates"
  | "decision"
  | "plan"
  | "rollback"
  | "changes"
  | "verification"
  | "measurement"
  | "memory"
  | "metaChanges";

export type EvolutionArtifacts = Record<ArtifactBucket, string[]>;

export type EvolutionApproval = {
  approvalId: string;
  cycleId: string;
  action: EvolutionAction;
  approvedBy: string;
  approvedAt: string;
  scope: string;
  policyVersion: typeof EVOLUTION_POLICY_VERSION;
  evidenceRefs: string[];
  expiresAt: string | null;
  revokedAt: string | null;
};

export type EvolutionEvent = {
  id: string;
  from: EvolutionStage;
  to: EvolutionStage;
  at: string;
  actor: string;
  reason: string;
  evidenceRefs: string[];
};

export type ResearchRecordBase = {
  recordId: string;
  cycleId: string;
  actor: string;
  createdAt: string;
  evidenceRefs: string[];
};

export type ResearchBrief = ResearchRecordBase & {
  kind: "research-brief";
  decisionQuestion: string;
  owner: string;
  deadline: string | null;
  assumptions: string[];
  constraints: string[];
  evidenceThreshold: string;
  protectedOutcomes: string[];
};

export type ResearchBudget = {
  maxQueries: number;
  maxSources: number;
  maxMinutes: number;
  maxCostUsd: number;
};

export type ResearchPlan = ResearchRecordBase & {
  kind: "research-plan";
  briefId: string;
  questions: string[];
  sourceStrategy: string[];
  budget: ResearchBudget;
  stopConditions: string[];
};

export type QueryRecord = ResearchRecordBase & {
  kind: "query";
  query: string;
  rationale: string;
  tool: string;
  parentQueryId: string | null;
  resultRefs: string[];
};

export type ResearchSourceClass =
  | "repository"
  | "user-research"
  | "primary-technical"
  | "official-documentation"
  | "independent-reproduction"
  | "community"
  | "unverified";

export type SourceRecord = ResearchRecordBase & {
  kind: "source";
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
};

export type ResearchClaimType =
  | "fact"
  | "mechanism"
  | "limitation"
  | "user-problem"
  | "prediction"
  | "recommendation";

export type ClaimRecord = ResearchRecordBase & {
  kind: "claim";
  statement: string;
  claimType: ResearchClaimType;
  confidence: number;
  uncertainty: string;
  supportingSourceIds: string[];
  contradictingSourceIds: string[];
  expiresAt: string | null;
};

export type ContradictionRecord = ResearchRecordBase & {
  kind: "contradiction";
  claimIds: string[];
  summary: string;
  suspectedCause: string;
  affectedDecision: string;
  status: "open" | "resolved" | "accepted-uncertainty";
};

export type OpportunityRecord = ResearchRecordBase & {
  kind: "opportunity";
  title: string;
  problem: string;
  expectedOutcome: string;
  evidenceClaimIds: string[];
  alternatives: string[];
  estimatedCost: string;
  risk: string;
  uncertainty: string;
  learningValue: string;
  smallestExperiment: string;
};

export type DecisionRecord = ResearchRecordBase & {
  kind: "decision";
  selectedOpportunityId: string;
  rejectedOpportunityIds: string[];
  rationale: string;
};

export type ExperimentRecord = ResearchRecordBase & {
  kind: "experiment";
  decisionId: string;
  hypothesis: string;
  method: string;
  successCriteria: string[];
  guardrails: string[];
  rollbackPlan: string[];
};

export type ExecutionHandoff = ResearchRecordBase & {
  kind: "execution-handoff";
  experimentId: string;
  objective: string;
  allowedScope: string[];
  forbiddenScope: string[];
  acceptanceCriteria: string[];
  verificationPlan: string[];
  rollbackPlan: string[];
  parameterDigest: string;
};

export type EvolutionResearchRecords = {
  briefs: ResearchBrief[];
  plans: ResearchPlan[];
  queries: QueryRecord[];
  sources: SourceRecord[];
  claims: ClaimRecord[];
  contradictions: ContradictionRecord[];
  opportunities: OpportunityRecord[];
  decisions: DecisionRecord[];
  experiments: ExperimentRecord[];
  executionHandoffs: ExecutionHandoff[];
};

export type EvolutionCycle = {
  schemaVersion: 1;
  cycleId: string;
  objective: string;
  autonomy: AutonomyLevel;
  risk: RiskClass;
  stage: EvolutionStage;
  createdAt: string;
  updatedAt: string;
  artifacts: EvolutionArtifacts;
  approvals: EvolutionApproval[];
  history: EvolutionEvent[];
  research?: EvolutionResearchRecords;
};

export type CreateCycleInput = {
  cycleId: string;
  objective: string;
  autonomy: AutonomyLevel;
  risk: RiskClass;
  now?: string;
};

export type TransitionInput = {
  actor: string;
  reason: string;
  now?: string;
  addArtifacts?: Partial<Record<ArtifactBucket, string[]>>;
  appendResearch?: Partial<EvolutionResearchRecords>;
  approvals?: EvolutionApproval[];
  verificationPassed?: boolean;
};

export type AuthorizationDecision = {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  matchedApprovalId: string | null;
};
