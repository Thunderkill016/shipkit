import type {
  AuthorizationDecision,
  AutonomyLevel,
  EvolutionAction,
  EvolutionApproval,
  RiskClass,
} from "./types.js";

const autonomyRank: Record<AutonomyLevel, number> = {
  A0: 0,
  A1: 1,
  A2: 2,
  A3: 3,
  A4: 4,
};

const riskRank: Record<RiskClass, number> = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
};

const minimumAutonomy: Record<EvolutionAction, AutonomyLevel> = {
  inspect: "A0",
  research: "A1",
  plan: "A1",
  "record-memory": "A1",
  "run-checks": "A1",
  "modify-code": "A3",
  "open-draft-pr": "A3",
  merge: "A4",
  deploy: "A4",
  "production-write": "A4",
  "read-secrets": "A4",
  spend: "A4",
};

const protectedActions = new Set<EvolutionAction>([
  "merge",
  "deploy",
  "production-write",
  "read-secrets",
  "spend",
]);

function hasApproval(action: EvolutionAction, approvals: EvolutionApproval[]): boolean {
  return approvals.some(
    (approval) => approval.action === action && approval.scope.trim().length > 0
  );
}

export function authorizeAction(input: {
  autonomy: AutonomyLevel;
  risk: RiskClass;
  action: EvolutionAction;
  approvals?: EvolutionApproval[];
}): AuthorizationDecision {
  const approvals = input.approvals ?? [];
  const required = minimumAutonomy[input.action];

  if (autonomyRank[input.autonomy] < autonomyRank[required]) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `${input.action} requires ${required}; cycle is ${input.autonomy}`,
    };
  }

  const needsApproval =
    protectedActions.has(input.action) ||
    (riskRank[input.risk] >= riskRank.R3 &&
      (input.action === "modify-code" || input.action === "open-draft-pr"));

  if (needsApproval && !hasApproval(input.action, approvals)) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `${input.action} requires explicit scoped approval at ${input.risk}`,
    };
  }

  return {
    allowed: true,
    requiresApproval: needsApproval,
    reason: `${input.action} is permitted for ${input.autonomy}/${input.risk}`,
  };
}
