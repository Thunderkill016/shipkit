import { createConsoleMailer, createResendMailer, type MailPort } from "@cyclewarden/mail";

let cachedMailer: MailPort | null = null;

/**
 * Resolves the mail adapter based on env variables.
 * If RESEND_API_KEY is configured, returns ResendMailer.
 * Otherwise, falls back to ConsoleMailer.
 */
export function getMailer(): MailPort {
  if (cachedMailer) return cachedMailer;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const from = process.env.MAIL_FROM ?? "onboarding@resend.dev";
    cachedMailer = createResendMailer(apiKey, from);
    return cachedMailer;
  }

  // Fallback to console mailer
  cachedMailer = createConsoleMailer();
  return cachedMailer;
}
