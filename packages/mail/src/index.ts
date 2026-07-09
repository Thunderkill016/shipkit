/**
 * MailPort — transactional email (Resend / SMTP adapters later).
 */
export interface MailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface MailPort {
  send(message: MailMessage): Promise<{ id?: string }>;
}

/** Dev stub — logs instead of sending. */
export function createConsoleMailer(defaultFrom = "noreply@shipkit.local"): MailPort {
  return {
    async send(message) {
      console.log("[shipkit/mail]", {
        from: message.from ?? defaultFrom,
        to: message.to,
        subject: message.subject,
      });
      return { id: `dev-${Date.now()}` };
    },
  };
}

export { createResendMailer } from "./resend";
