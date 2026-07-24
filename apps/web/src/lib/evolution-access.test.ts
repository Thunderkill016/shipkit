import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
  getAuthAdapterName: vi.fn(),
}));

import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { getEvolutionMutationAccess } from "./evolution-access";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, NODE_ENV: "test" };
  vi.mocked(getAuthAdapterName).mockReturnValue("none");
  vi.mocked(getAuth).mockReturnValue({
    getUser: vi.fn().mockResolvedValue(null),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signOut: vi.fn(),
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

describe("Evolution workspace mutation access", () => {
  it("requires an explicit server-side opt in", async () => {
    delete process.env.CYCLEWARDEN_WORKSPACE_ACTIONS;

    await expect(getEvolutionMutationAccess()).resolves.toMatchObject({
      allowed: false,
      reason: expect.stringContaining("CYCLEWARDEN_WORKSPACE_ACTIONS"),
    });
  });

  it("allows an opted-in local demo operator", async () => {
    process.env.CYCLEWARDEN_WORKSPACE_ACTIONS = "enabled";

    await expect(getEvolutionMutationAccess()).resolves.toEqual({
      allowed: true,
      actor: "cyclewarden-local-operator",
      reason: "Local demo operator enabled for the configured repository.",
    });
  });

  it("fails closed on Vercel local storage", async () => {
    process.env.CYCLEWARDEN_WORKSPACE_ACTIONS = "enabled";
    process.env.VERCEL = "1";

    await expect(getEvolutionMutationAccess()).resolves.toMatchObject({
      allowed: false,
      reason: expect.stringContaining("ephemeral"),
    });
  });

  it("rejects unauthenticated production demo mode", async () => {
    process.env = {
      ...process.env,
      CYCLEWARDEN_WORKSPACE_ACTIONS: "enabled",
      NODE_ENV: "production",
    };

    await expect(getEvolutionMutationAccess()).resolves.toMatchObject({
      allowed: false,
      reason: expect.stringContaining("configured auth adapter"),
    });
  });

  it("requires configured-auth users to be explicitly allowlisted", async () => {
    process.env.CYCLEWARDEN_WORKSPACE_ACTIONS = "enabled";
    process.env.CYCLEWARDEN_OPERATOR_IDS = "another-user";
    vi.mocked(getAuthAdapterName).mockReturnValue("better-auth");
    vi.mocked(getAuth).mockReturnValue({
      getUser: vi.fn().mockResolvedValue({ id: "operator-123", email: "operator@example.com" }),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    await expect(getEvolutionMutationAccess()).resolves.toMatchObject({
      allowed: false,
      reason: expect.stringContaining("CYCLEWARDEN_OPERATOR_IDS"),
    });
  });

  it("uses a pseudonymous actor for an allowlisted authenticated operator", async () => {
    process.env.CYCLEWARDEN_WORKSPACE_ACTIONS = "enabled";
    process.env.CYCLEWARDEN_OPERATOR_IDS = "operator-123";
    vi.mocked(getAuthAdapterName).mockReturnValue("supabase");
    vi.mocked(getAuth).mockReturnValue({
      getUser: vi.fn().mockResolvedValue({ id: "operator-123", email: "operator@example.com" }),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    const access = await getEvolutionMutationAccess();
    expect(access.allowed).toBe(true);
    expect(access.actor).toMatch(/^cyclewarden-workspace-operator:[a-f0-9]{16}$/);
    expect(access.actor).not.toContain("operator-123");
    expect(access.actor).not.toContain("operator@example.com");
  });
});
