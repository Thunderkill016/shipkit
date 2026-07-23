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
  action: EvolutionAction;
  approvedBy: string;
  approvedAt: string;
  scope: string;
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
  approvals?: EvolutionApproval[];
  verificationPassed?: boolean;
};

export type AuthorizationDecision = {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
};
