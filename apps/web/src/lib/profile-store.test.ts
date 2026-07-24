import { describe, it, expect, beforeEach } from "vitest";
import { getProfile, updateProfile } from "./profile-store";

describe("profile-store (demo mode)", () => {
  beforeEach(() => {
    const g = globalThis as unknown as { __cyclewardenProfiles?: Map<string, unknown> };
    if (g.__cyclewardenProfiles) {
      g.__cyclewardenProfiles.clear();
    }
  });

  it("should create profile with default display name from email", async () => {
    const p = await getProfile("user-1", "john.doe@example.com");
    expect(p.id).toBe("user-1");
    expect(p.email).toBe("john.doe@example.com");
    expect(p.displayName).toBe("john.doe");
    expect(p.avatarUrl).toBeNull();
  });

  it("should update display name and avatar url", async () => {
    await updateProfile("user-1", { displayName: "John Doe" });
    let p = await getProfile("user-1", "john.doe@example.com");
    expect(p.displayName).toBe("John Doe");

    await updateProfile("user-1", { avatarUrl: "http://example.com/avatar.png" });
    p = await getProfile("user-1", "john.doe@example.com");
    expect(p.displayName).toBe("John Doe");
    expect(p.avatarUrl).toBe("http://example.com/avatar.png");
  });
});
