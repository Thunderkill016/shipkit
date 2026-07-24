import "server-only";

import { createHash } from "node:crypto";
import { getAuth, getAuthAdapterName } from "@/lib/auth";

export type EvolutionMutationAccess = {
  allowed: boolean;
  actor: string | null;
  reason: string;
};

function operatorIds(): Set<string> {
  return new Set(
    (process.env.CYCLEWARDEN_OPERATOR_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function pseudonymousActor(userId: string): string {
  const digest = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `cyclewarden-workspace-operator:${digest}`;
}

export async function getEvolutionMutationAccess(): Promise<EvolutionMutationAccess> {
  if (process.env.CYCLEWARDEN_WORKSPACE_ACTIONS !== "enabled") {
    return {
      allowed: false,
      actor: null,
      reason: "Set CYCLEWARDEN_WORKSPACE_ACTIONS=enabled to opt in to local workspace actions.",
    };
  }

  if (process.env.VERCEL) {
    return {
      allowed: false,
      actor: null,
      reason: "Workspace actions are disabled on Vercel because local journal storage is ephemeral.",
    };
  }

  const adapter = getAuthAdapterName();
  if (adapter === "none") {
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        actor: null,
        reason: "Production workspace actions require a configured auth adapter.",
      };
    }
    return {
      allowed: true,
      actor: "cyclewarden-local-operator",
      reason: "Local demo operator enabled for the configured repository.",
    };
  }

  const user = await getAuth().getUser();
  if (!user) {
    return { allowed: false, actor: null, reason: "Sign in to operate the workspace." };
  }

  if (!operatorIds().has(user.id)) {
    return {
      allowed: false,
      actor: null,
      reason: "This account is not listed in CYCLEWARDEN_OPERATOR_IDS.",
    };
  }

  return {
    allowed: true,
    actor: pseudonymousActor(user.id),
    reason: "Authenticated workspace operator.",
  };
}
