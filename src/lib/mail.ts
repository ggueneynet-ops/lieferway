/**
 * Customer mail.
 * Real: RESEND_API_KEY, or SMTP_HOST (+ SMTP_USER/SMTP_PASS), or MAIL_WEBHOOK_URL.
 * Otherwise demo: logs the message and returns mock=true.
 */
export type MailResult = { ok: boolean; mock: boolean; channel: string; error?: string };

const FROM = () => process.env.MAIL_FROM?.trim() || "Lieferway <noreply@lieferway.de>";

export async function sendCustomerEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  const from = FROM();
  const html = opts.html ?? `<p>${escapeHtml(opts.text).replaceAll("\n", "<br/>")}</p>`;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          text: opts.text,
          html,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[lieferway mail resend]", res.status, detail);
        return { ok: false, mock: false, channel: "resend", error: `HTTP ${res.status}` };
      }
      console.info("[lieferway mail resend]", { to: opts.to, subject: opts.subject });
      return { ok: true, mock: false, channel: "resend" };
    } catch (e) {
      console.error("[lieferway mail resend]", e);
      return { ok: false, mock: false, channel: "resend", error: e instanceof Error ? e.message : "resend failed" };
    }
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) {
    try {
      const nodemailer = await import("nodemailer");
      const createTransport =
        nodemailer.createTransport ??
        (nodemailer as { default?: { createTransport: typeof nodemailer.createTransport } }).default?.createTransport;
      if (!createTransport) throw new Error("nodemailer.createTransport missing");
      const port = Number(process.env.SMTP_PORT ?? 587);
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS ?? "";
      const transporter = createTransport({
        host: smtpHost,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        auth: user ? { user, pass } : undefined,
      });
      await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html,
      });
      console.info("[lieferway mail smtp]", { to: opts.to, subject: opts.subject, host: smtpHost });
      return { ok: true, mock: false, channel: "smtp" };
    } catch (e) {
      console.error("[lieferway mail smtp]", e);
      return { ok: false, mock: false, channel: "smtp", error: e instanceof Error ? e.message : "smtp failed" };
    }
  }

  const webhook = process.env.MAIL_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text, html }),
      });
      if (!res.ok) {
        return { ok: false, mock: false, channel: "webhook", error: `HTTP ${res.status}` };
      }
      console.info("[lieferway mail webhook]", { to: opts.to, subject: opts.subject });
      return { ok: true, mock: false, channel: "webhook" };
    } catch (e) {
      return { ok: false, mock: false, channel: "webhook", error: e instanceof Error ? e.message : "webhook failed" };
    }
  }

  console.info("[lieferway mail demo] no RESEND_API_KEY/SMTP_HOST — not sent", {
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
  return { ok: true, mock: true, channel: "demo" };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
