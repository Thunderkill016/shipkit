import {
  EVOLUTION_POLICY_VERSION,
  type AuthorizationDecision,
  type AutonomyLevel,
  type EvolutionAction,
  type EvolutionApproval,
  type RiskClass,
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

function validDate(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchingApproval(input: {
  action: EvolutionAction;
  cycleId: string;
  requiredScope: string;
  approvals: EvolutionApproval[];
  now: string;
}): EvolutionApproval | undefined {
  const now = Date.parse(input.now);
  return input.approvals.find((approval) => {
    const expiry = validDate(approval.expiresAt);
    return (
      approval.action === input.action &&
      approval.cycleId === input.cycleId &&
      approval.scope === input.requiredScope &&
      approval.policyVersion === EVOLUTION_POLICY_VERSION &&
      approval.revokedAt === null &&
      (expiry === null || expiry > now)
    );
  });
}

export function authorizeAction(input: {
  autonomy: AutonomyLevel;
  risk: RiskClass;
  action: EvolutionAction;
  cycleId?: string;
  requiredScope?: string;
  approvals?: EvolutionApproval[];
  now?: string;
}): AuthorizationDecision {
  const approvals = input.approvals ?? [];
  const required = minimumAutonomy[input.action];

  if (autonomyRank[input.autonomy] < autonomyRank[required]) {
    return {
      allowed: false,
      requiresApproval: false,
      matchedApprovalId: null,
      reason: `${input.action} requires ${required}; cycle is ${input.autonomy}`,
    };
  }

  const needsApproval =
    protectedActions.has(input.action) ||
    (riskRank[input.risk] >= riskRank.R3 &&
      (input.action === "modify-code" || input.action === "open-draft-pr"));

  if (!needsApproval) {
    return {
      allowed: true,
      requiresApproval: false,
      matchedApprovalId: null,
      reason: `${input.action} is permitted for ${input.autonomy}/${input.risk}`,
    };
  }

  const cycleId = input.cycleId?.trim();
  const requiredScope = input.requiredScope?.trim();
  if (!cycleId || !requiredScope) {
    return {
      allowed: false,
      requiresApproval: true,
      matchedApprovalId: null,
      reason: `${input.action} requires an exact cycle and resource scope`,
    };
  }

  const approval = matchingApproval({
    action: input.action,
    cycleId,
    requiredScope,
    approvals,
    now: input.now ?? new Date().toISOString(),
  });
  if (!approval) {
    return {
      allowed: false,
      requiresApproval: true,
      matchedApprovalId: null,
      reason: `${input.action} requires a current approval for ${cycleId} and scope ${requiredScope}`,
    };
  }

  return {
    allowed: true,
    requiresApproval: true,
    matchedApprovalId: approval.approvalId,
    reason: `${input.action} is permitted by approval ${approval.approvalId}`,
  };
}