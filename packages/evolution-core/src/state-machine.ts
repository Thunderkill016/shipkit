import { authorizeAction } from "./policy.js";
import { emptyResearchRecords, mergeResearchRecords } from "./research-records.js";
import type {
  ArtifactBucket,
  CreateCycleInput,
  EvolutionArtifacts,
  EvolutionCycle,
  EvolutionStage,
  TransitionInput,
} from "./types.js";

const normalNext: Partial<Record<EvolutionStage, EvolutionStage>> = {
  created: "observed",
  observed: "modeled",
  modeled: "diagnosed",
  diagnosed: "researched",
  researched: "decided",
  decided: "planned",
  planned: "executing",
  executing: "implemented",
  implemented: "verified",
  verified: "measured",
  measured: "learned",
  learned: "meta-improved",
  "meta-improved": "completed",
};

const terminalStages = new Set<EvolutionStage>([
  "completed",
  "rejected",
  "rolled-back",
  "inconclusive",
]);

const rejectableStages = new Set<EvolutionStage>([
  "diagnosed",
  "researched",
  "decided",
  "planned",
  "executing",
  "implemented",
  "verified",
  "measured",
  "learned",
]);

const rollbackStages = new Set<EvolutionStage>([
  "executing",
  "implemented",
  "verified",
  "measured",
]);

const requiredArtifacts: Partial<Record<EvolutionStage, ArtifactBucket[]>> = {
  observed: ["baseline"],
  modeled: ["model"],
  diagnosed: ["diagnosis", "candidates"],
  researched: ["research"],
  decided: ["decision"],
  planned: ["plan", "rollback"],
  implemented: ["changes"],
  verified: ["verification"],
  measured: ["measurement"],
  learned: ["memory"],
  "meta-improved": ["metaChanges"],
};

export class EvolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolutionError";
  }
}

function emptyArtifacts(): EvolutionArtifacts {
  return {
    baseline: [],
    model: [],
    diagnosis: [],
    research: [],
    candidates: [],
    decision: [],
    plan: [],
    rollback: [],
    changes: [],
    verification: [],
    measurement: [],
    memory: [],
    metaChanges: [],
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeArtifacts(
  current: EvolutionArtifacts,
  additions: TransitionInput["addArtifacts"] = {}
): EvolutionArtifacts {
  const next = { ...current };
  for (const bucket of Object.keys(additions) as ArtifactBucket[]) {
    next[bucket] = unique([...(current[bucket] ?? []), ...(additions[bucket] ?? [])]);
  }
  return next;
}

function assertRequiredArtifacts(stage: EvolutionStage, artifacts: EvolutionArtifacts): void {
  for (const bucket of requiredArtifacts[stage] ?? []) {
    if (artifacts[bucket].length === 0) {
      throw new EvolutionError(`${stage} requires at least one ${bucket} artifact`);
    }
  }
}

export function createCycle(input: CreateCycleInput): EvolutionCycle {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(input.cycleId)) {
    throw new EvolutionError("cycleId must be 3-128 portable identifier characters");
  }
  if (input.objective.trim().length < 8) {
    throw new EvolutionError("objective must be specific enough to evaluate");
  }

  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: 1,
    cycleId: input.cycleId,
    objective: input.objective.trim(),
    autonomy: input.autonomy,
    risk: input.risk,
    stage: "created",
    createdAt: now,
    updatedAt: now,
    artifacts: emptyArtifacts(),
    approvals: [],
    history: [],
    research: emptyResearchRecords(),
  };
}

function canTransition(from: EvolutionStage, to: EvolutionStage): boolean {
  if (normalNext[from] === to) return true;
  if (from === "learned" && to === "completed") return true;
  if (rejectableStages.has(from) && (to === "rejected" || to === "inconclusive")) {
    return true;
  }
  if (rollbackStages.has(from) && to === "rolled-back") return true;
  return false;
}

export function transitionCycle(
  cycle: EvolutionCycle,
  to: EvolutionStage,
  input: TransitionInput
): EvolutionCycle {
  if (terminalStages.has(cycle.stage)) {
    throw new EvolutionError(`cycle is terminal at ${cycle.stage}`);
  }
  if (!canTransition(cycle.stage, to)) {
    throw new EvolutionError(`invalid transition: ${cycle.stage} -> ${to}`);
  }
  if (!input.actor.trim() || !input.reason.trim()) {
    throw new EvolutionError("transition requires actor and reason");
  }

  const now = input.now ?? new Date().toISOString();
  const approvals = [...cycle.approvals, ...(input.approvals ?? [])];
  if (to === "executing") {
    const decision = authorizeAction({
      autonomy: cycle.autonomy,
      risk: cycle.risk,
      action: "modify-code",
      cycleId: cycle.cycleId,
      requiredScope: `cycle:${cycle.cycleId}:modify-code`,
      approvals,
      now,
    });
    if (!decision.allowed) throw new EvolutionError(decision.reason);
  }

  if (to === "verified" && input.verificationPassed !== true) {
    throw new EvolutionError("verified requires an explicitly passing verification result");
  }

  const artifacts = mergeArtifacts(cycle.artifacts, input.addArtifacts);
  assertRequiredArtifacts(to, artifacts);

  let research;
  try {
    research = mergeResearchRecords(cycle.research, input.appendResearch);
  } catch (error) {
    throw new EvolutionError(error instanceof Error ? error.message : String(error));
  }

  const evidenceRefs = unique(
    Object.values(input.addArtifacts ?? {}).flatMap((refs) => refs ?? [])
  );

  return {
    ...cycle,
    stage: to,
    updatedAt: now,
    artifacts,
    approvals,
    research,
    history: [
      ...cycle.history,
      {
        id: `${cycle.cycleId}:${cycle.history.length + 1}`,
        from: cycle.stage,
        to,
        at: now,
        actor: input.actor.trim(),
        reason: input.reason.trim(),
        evidenceRefs,
      },
    ],
  };
}
