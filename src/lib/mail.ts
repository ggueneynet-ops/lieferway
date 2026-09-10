/**
 * Customer mail. Demo logs the message (no SMTP required).
 * Optional MAIL_WEBHOOK_URL receives JSON { to, subject, text } for a real relay.
 */
export async function sendCustomerEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; mock: boolean; error?: string }> {
  const webhook = process.env.MAIL_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.MAIL_FROM ?? "Lieferway <noreply@lieferway.de>",
          to: opts.to,
          subject: opts.subject,
          text: opts.text,
        }),
      });
      if (!res.ok) {
        return { ok: false, mock: false, error: `HTTP ${res.status}` };
      }
      return { ok: true, mock: false };
    } catch (e) {
      return { ok: false, mock: false, error: e instanceof Error ? e.message : "mail failed" };
    }
  }
  console.info("[lieferway mail demo]", opts);
  return { ok: true, mock: true };
}
