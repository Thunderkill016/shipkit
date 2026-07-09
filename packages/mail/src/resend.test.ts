import { describe, it, expect, vi } from "vitest";
import { createResendMailer } from "./resend";

describe("createResendMailer", () => {
  it("should send email using fetch", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ id: "test-id-123" }),
    };

    const globalFetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", globalFetchMock);

    const mailer = createResendMailer("test-api-key", "sender@example.com");
    const result = await mailer.send({
      to: "receiver@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    });

    expect(result.id).toBe("test-id-123");
    expect(globalFetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-api-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "sender@example.com",
        to: "receiver@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
        text: undefined,
      }),
    });

    vi.unstubAllGlobals();
  });

  it("should throw error if fetch fails", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid email",
    };

    const globalFetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", globalFetchMock);

    const mailer = createResendMailer("test-api-key");
    await expect(
      mailer.send({
        to: "receiver@example.com",
        subject: "Hello",
      })
    ).rejects.toThrow("Resend API error: 400 Bad Request - Invalid email");

    vi.unstubAllGlobals();
  });
});
