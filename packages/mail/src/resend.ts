import type { MailMessage, MailPort } from "./index";

/**
 * Resend implementation of MailPort.
 * Uses native fetch to communicate with Resend API.
 */
export function createResendMailer(apiKey: string, defaultFrom = "onboarding@resend.dev"): MailPort {
  return {
    async send(message: MailMessage) {
      if (!apiKey) {
        throw new Error("Resend API key is required");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from ?? defaultFrom,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as { id: string };
      return { id: data.id };
    },
  };
}
