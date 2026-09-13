import type { ProviderSendInput, ProviderSendResult } from "./types";

function fromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    "Lieferway <noreply@lieferway.de>"
  );
}

function replyToAddress() {
  return process.env.EMAIL_REPLY_TO?.trim() || process.env.MAIL_REPLY_TO?.trim() || "info@lieferway.de";
}

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/**
 * Resolve provider:
 * - EMAIL_PROVIDER=resend|console|smtp|webhook (explicit)
 * - else: RESEND_API_KEY → resend; SMTP_HOST → smtp; MAIL_WEBHOOK_URL → webhook;
 * - missing key in non-production → console (builds must not fail)
 */
export function resolveEmailProvider(): "resend" | "smtp" | "webhook" | "console" {
  const explicit = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (explicit === "console" || explicit === "resend" || explicit === "smtp" || explicit === "webhook") {
    if (explicit === "resend" && !process.env.RESEND_API_KEY?.trim()) {
      if (!isProduction()) return "console";
    }
    if (explicit === "resend") return "resend";
    if (explicit === "smtp") return process.env.SMTP_HOST?.trim() ? "smtp" : !isProduction() ? "console" : "smtp";
    if (explicit === "webhook") return process.env.MAIL_WEBHOOK_URL?.trim() ? "webhook" : !isProduction() ? "console" : "webhook";
    return "console";
  }
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SMTP_HOST?.trim()) return "smtp";
  if (process.env.MAIL_WEBHOOK_URL?.trim()) return "webhook";
  return "console";
}

export async function sendViaProvider(opts: ProviderSendInput): Promise<ProviderSendResult> {
  const channel = resolveEmailProvider();
  const from = fromAddress();
  const replyTo = opts.replyTo ?? replyToAddress();
  const attachMeta = opts.attachments?.map((a) => ({ filename: a.filename, bytes: a.content.length }));

  if (channel === "console") {
    console.info("[lieferway email console]", {
      to: opts.to,
      from,
      replyTo,
      subject: opts.subject,
      text: opts.text,
      attachments: attachMeta,
    });
    return { ok: true, mock: true, channel: "console" };
  }

  if (channel === "resend") {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      const msg = "RESEND_API_KEY missing";
      console.error("[lieferway email resend]", msg);
      return { ok: false, mock: false, channel: "resend", error: msg };
    }
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
          reply_to: replyTo,
          subject: opts.subject,
          text: opts.text,
          html: opts.html,
          attachments: opts.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
            content_type: a.contentType ?? "application/pdf",
          })),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[lieferway email resend]", res.status, detail);
        return { ok: false, mock: false, channel: "resend", error: `HTTP ${res.status}` };
      }
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      console.info("[lieferway email resend]", { to: opts.to, subject: opts.subject, id: body.id });
      return { ok: true, mock: false, channel: "resend", messageId: body.id };
    } catch (e) {
      console.error("[lieferway email resend]", e);
      return { ok: false, mock: false, channel: "resend", error: e instanceof Error ? e.message : "resend failed" };
    }
  }

  if (channel === "smtp") {
    const smtpHost = process.env.SMTP_HOST?.trim();
    if (!smtpHost) {
      return { ok: false, mock: false, channel: "smtp", error: "SMTP_HOST missing" };
    }
    try {
      const nodemailer = await import("nodemailer");
      const createTransport =
        nodemailer.createTransport ??
        (nodemailer as { default?: { createTransport: typeof nodemailer.createTransport } }).default
          ?.createTransport;
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
      const info = await transporter.sendMail({
        from,
        to: opts.to,
        replyTo,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType ?? "application/pdf",
        })),
      });
      console.info("[lieferway email smtp]", { to: opts.to, subject: opts.subject, host: smtpHost });
      return {
        ok: true,
        mock: false,
        channel: "smtp",
        messageId: typeof info.messageId === "string" ? info.messageId : undefined,
      };
    } catch (e) {
      console.error("[lieferway email smtp]", e);
      return { ok: false, mock: false, channel: "smtp", error: e instanceof Error ? e.message : "smtp failed" };
    }
  }

  // webhook
  const webhook = process.env.MAIL_WEBHOOK_URL?.trim();
  if (!webhook) {
    return { ok: false, mock: false, channel: "webhook", error: "MAIL_WEBHOOK_URL missing" };
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        replyTo,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        attachments: attachMeta,
      }),
    });
    if (!res.ok) {
      return { ok: false, mock: false, channel: "webhook", error: `HTTP ${res.status}` };
    }
    console.info("[lieferway email webhook]", { to: opts.to, subject: opts.subject });
    return { ok: true, mock: false, channel: "webhook" };
  } catch (e) {
    return { ok: false, mock: false, channel: "webhook", error: e instanceof Error ? e.message : "webhook failed" };
  }
}

export const emailFromAddress = fromAddress;
export const emailReplyToAddress = replyToAddress;
