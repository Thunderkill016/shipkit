import { describe, expect, it } from "vitest";
import { EmailPasswordSchema } from "./validation";

describe("EmailPasswordSchema", () => {
  it("accepts valid credentials", () => {
    const r = EmailPasswordSchema.safeParse({
      email: "User@Example.com",
      password: "password1",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("user@example.com");
    }
  });

  it("rejects short password", () => {
    const r = EmailPasswordSchema.safeParse({
      email: "a@b.co",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = EmailPasswordSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(r.success).toBe(false);
  });
});
