import type { EmailLocale } from "./types";

const BRAND = {
  primary: "#E91E63",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#E8E8EC",
  bg: "#F7F7F8",
  white: "#FFFFFF",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { escapeHtml };

const FOOTER: Record<EmailLocale, string> = {
  de: "Dies ist eine transaktionale Nachricht zu Ihrem Lieferway-Konto oder Ihrer Bestellung. Keine Werbung — eine Abmeldung ist nicht erforderlich.",
  en: "This is a transactional message about your Lieferway account or order. Not marketing — no unsubscribe required.",
  tr: "Bu, Lieferway hesabınız veya siparişinizle ilgili işlemsel bir mesajdır. Pazarlama değildir — abonelikten çıkmanız gerekmez.",
};

/**
 * Branded, mobile-responsive HTML shell for transactional mail.
 * No marketing unsubscribe — transactional only.
 */
export function wrapTransactionalHtml(opts: {
  locale?: EmailLocale;
  preheader?: string;
  title: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}) {
  const locale = opts.locale ?? "de";
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : "";
  const title = escapeHtml(opts.title);
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<p style="margin:28px 0 8px;text-align:center;">
          <a href="${escapeHtml(opts.ctaUrl)}"
             style="display:inline-block;background:${BRAND.primary};color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">
            ${escapeHtml(opts.ctaLabel)}
          </a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.primary};padding:18px 24px;">
              <span style="font-family:'Plus Jakarta Sans',Inter,sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.02em;color:${BRAND.white};">Lieferway</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${BRAND.ink};">${title}</h1>
              <div style="font-size:15px;line-height:1.55;color:${BRAND.ink};">${opts.bodyHtml}</div>
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};border-top:1px solid ${BRAND.border};padding-top:16px;">
                ${escapeHtml(FOOTER[locale])}
                <br/>Lieferway · <a href="mailto:info@lieferway.de" style="color:${BRAND.muted};">info@lieferway.de</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
