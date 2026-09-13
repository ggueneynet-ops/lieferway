/**
 * Legacy entrypoint — prefer `@/lib/email` for transactional sends.
 * Delegates to the central provider (Resend / SMTP / webhook / console).
 */
import { sendViaProvider } from "@/lib/email/provider";
import type { EmailAttachment } from "@/lib/email/types";

export type MailResult = { ok: boolean; mock: boolean; channel: string; error?: string };
export type MailAttachment = EmailAttachment;

export async function sendCustomerEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}): Promise<MailResult> {
  const html = opts.html ?? `<p>${escapeHtml(opts.text).replaceAll("\n", "<br/>")}</p>`;
  return sendViaProvider({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html,
    attachments: opts.attachments,
  });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
