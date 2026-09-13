import { escapeHtml, wrapTransactionalHtml } from "../layout";
import type { EmailLocale, RenderedEmail, TransactionalEventType } from "../types";

function p(text: string) {
  return `<p style="margin:0 0 12px;">${escapeHtml(text)}</p>`;
}

function paragraphs(lines: string[]) {
  return lines.filter(Boolean).map(p).join("");
}

export type TemplateVars = {
  locale?: EmailLocale;
  name?: string;
  email?: string;
  restaurant?: string;
  orderCode?: string;
  orderId?: string;
  prepMinutes?: string | number;
  amountLabel?: string;
  reason?: string;
  link?: string;
  password?: string;
  businessName?: string;
  detail?: string;
  fulfillment?: "DELIVERY" | "PICKUP" | string;
};

const CTA: Record<EmailLocale, { order: string; account: string; partner: string; login: string }> = {
  de: { order: "Bestellung ansehen", account: "Zum Konto", partner: "Partner-Login", login: "Anmelden" },
  en: { order: "View order", account: "Open account", partner: "Partner login", login: "Sign in" },
  tr: { order: "Siparişi gör", account: "Hesaba git", partner: "Partner girişi", login: "Giriş yap" },
};

function loc(vars: TemplateVars): EmailLocale {
  return vars.locale === "en" || vars.locale === "tr" ? vars.locale : "de";
}

function orderLink(vars: TemplateVars) {
  return vars.link ?? (vars.orderId ? undefined : undefined);
}

export function renderTransactionalTemplate(
  eventType: TransactionalEventType,
  vars: TemplateVars,
): RenderedEmail {
  const locale = loc(vars);
  const cta = CTA[locale];
  const restaurant = vars.restaurant ?? "Lieferway";
  const code = vars.orderCode ?? "";
  const name = vars.name ?? "";
  const min = String(vars.prepMinutes ?? 25);
  const pickup = vars.fulfillment === "PICKUP";
  const appLink = vars.link;

  const copy = buildCopy(eventType, {
    locale,
    restaurant,
    code,
    name,
    min,
    pickup,
    amountLabel: vars.amountLabel,
    reason: vars.reason,
    businessName: vars.businessName,
    password: vars.password,
    email: vars.email,
    detail: vars.detail,
  });

  const ctaLabel =
    eventType.startsWith("order_") || eventType === "payment_failed" || eventType === "order_refunded"
      ? cta.order
      : eventType.startsWith("partner_")
        ? cta.partner
        : eventType === "user_registered" || eventType === "password_reset" || eventType === "email_verification"
          ? cta.login
          : undefined;

  const html = wrapTransactionalHtml({
    locale,
    preheader: copy.preheader,
    title: copy.title,
    bodyHtml: paragraphs(copy.bodyLines),
    ctaUrl: appLink,
    ctaLabel: appLink && ctaLabel ? ctaLabel : undefined,
  });

  const text = [copy.title, "", ...copy.bodyLines, appLink ? `\n${appLink}` : ""].filter(Boolean).join("\n");

  return { subject: copy.subject, text, html };
}

function buildCopy(
  eventType: TransactionalEventType,
  ctx: {
    locale: EmailLocale;
    restaurant: string;
    code: string;
    name: string;
    min: string;
    pickup: boolean;
    amountLabel?: string;
    reason?: string;
    businessName?: string;
    password?: string;
    email?: string;
    detail?: string;
  },
): { subject: string; title: string; preheader: string; bodyLines: string[] } {
  const { locale, restaurant, code, name, min, pickup } = ctx;
  const hello =
    locale === "en" ? (name ? `Hi ${name},` : "Hi,") : locale === "tr" ? (name ? `Merhaba ${name},` : "Merhaba,") : name ? `Hallo ${name},` : "Hallo,";

  switch (eventType) {
    case "user_registered":
      return locale === "en"
        ? {
            subject: "Welcome to Lieferway",
            title: "Welcome to Lieferway",
            preheader: "Your account is ready.",
            bodyLines: [hello, "Thanks for registering. You can order from neighbourhood restaurants right away.", "Questions? Reply to this email or write to info@lieferway.de."],
          }
        : locale === "tr"
          ? {
              subject: "Lieferway’e hoş geldiniz",
              title: "Lieferway’e hoş geldiniz",
              preheader: "Hesabınız hazır.",
              bodyLines: [hello, "Kayıt olduğunuz için teşekkürler. Mahalle restoranlarından hemen sipariş verebilirsiniz.", "Sorularınız için bu e-postayı yanıtlayın veya info@lieferway.de adresine yazın."],
            }
          : {
              subject: "Willkommen bei Lieferway",
              title: "Willkommen bei Lieferway",
              preheader: "Ihr Konto ist bereit.",
              bodyLines: [hello, "Danke für Ihre Registrierung. Sie können sofort bei Restaurants in Ihrer Nähe bestellen.", "Fragen? Antworten Sie auf diese E-Mail oder schreiben Sie an info@lieferway.de."],
            };

    case "email_verification":
      return {
        subject: locale === "en" ? "Confirm your email" : locale === "tr" ? "E-postanızı onaylayın" : "E-Mail bestätigen",
        title: locale === "en" ? "Confirm your email" : locale === "tr" ? "E-postanızı onaylayın" : "E-Mail bestätigen",
        preheader: locale === "en" ? "Verify your Lieferway address." : "Lieferway E-Mail bestätigen.",
        bodyLines: [hello, locale === "en" ? "Please confirm your email address to finish setup." : locale === "tr" ? "Kurulumu tamamlamak için e-posta adresinizi onaylayın." : "Bitte bestätigen Sie Ihre E-Mail-Adresse, um die Einrichtung abzuschließen.", ctx.detail ?? ""].filter(Boolean),
      };

    case "password_reset":
      return {
        subject: locale === "en" ? "Reset your password" : locale === "tr" ? "Şifrenizi sıfırlayın" : "Passwort zurücksetzen",
        title: locale === "en" ? "Reset your password" : locale === "tr" ? "Şifrenizi sıfırlayın" : "Passwort zurücksetzen",
        preheader: locale === "en" ? "Password reset link" : "Link zum Zurücksetzen",
        bodyLines: [hello, locale === "en" ? "Use the button below to choose a new password. If you did not request this, you can ignore this email." : locale === "tr" ? "Yeni bir şifre seçmek için aşağıdaki düğmeyi kullanın. Bunu siz istemediyseniz bu e-postayı yok sayabilirsiniz." : "Über den Button unten können Sie ein neues Passwort wählen. Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail einfach."],
      };

    case "order_created":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Order placed`,
            title: `${restaurant} · Order placed`,
            preheader: `Order ${code} received.`,
            bodyLines: [hello, `We received your order ${code} at ${restaurant}.`, "You will get another email when the restaurant accepts."],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · Sipariş alındı`,
              title: `${restaurant} · Sipariş alındı`,
              preheader: `${code} siparişi alındı.`,
              bodyLines: [hello, `${restaurant} için ${code} siparişiniz alındı.`, "Restoran kabul ettiğinde başka bir e-posta alırsınız."],
            }
          : {
              subject: `Lieferway · ${code} · Bestellung eingegangen`,
              title: `${restaurant} · Bestellung eingegangen`,
              preheader: `Bestellung ${code} ist da.`,
              bodyLines: [hello, `Wir haben Ihre Bestellung ${code} bei ${restaurant} erhalten.`, "Sobald das Restaurant annimmt, erhalten Sie eine weitere E-Mail."],
            };

    case "order_accepted":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Accepted`,
            title: `${restaurant} · Accepted`,
            preheader: `Prep about ${min} min.`,
            bodyLines: [hello, `${restaurant} accepted order ${code}.`, `Estimated prep time: about ${min} minutes.`],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · Kabul edildi`,
              title: `${restaurant} · Kabul edildi`,
              preheader: `Hazırlık yaklaşık ${min} dk.`,
              bodyLines: [hello, `${restaurant} ${code} siparişini kabul etti.`, `Tahmini hazırlık: yaklaşık ${min} dakika.`],
            }
          : {
              subject: `Lieferway · ${code} · Angenommen`,
              title: `${restaurant} · Angenommen`,
              preheader: `Zubereitung ca. ${min} Min.`,
              bodyLines: [hello, `${restaurant} hat Bestellung ${code} angenommen.`, `Geschätzte Zubereitung: ca. ${min} Minuten.`],
            };

    case "order_rejected":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Declined`,
            title: `${restaurant} · Declined`,
            preheader: `Order ${code} was declined.`,
            bodyLines: [hello, `${restaurant} could not accept order ${code}.`, ctx.reason ? `Reason: ${ctx.reason}` : "Any payment authorization will be released or refunded according to your payment method.", "You can place a new order anytime."],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · Reddedildi`,
              title: `${restaurant} · Reddedildi`,
              preheader: `${code} reddedildi.`,
              bodyLines: [hello, `${restaurant} ${code} siparişini kabul edemedi.`, ctx.reason ? `Neden: ${ctx.reason}` : "Ödeme yöntemine göre yetkilendirme iptal edilir veya iade edilir.", "İstediğiniz zaman yeni sipariş verebilirsiniz."],
            }
          : {
              subject: `Lieferway · ${code} · Abgelehnt`,
              title: `${restaurant} · Abgelehnt`,
              preheader: `Bestellung ${code} abgelehnt.`,
              bodyLines: [hello, `${restaurant} konnte Bestellung ${code} nicht annehmen.`, ctx.reason ? `Grund: ${ctx.reason}` : "Eine etwaige Zahlungsautorisierung wird je nach Zahlungsmittel freigegeben oder erstattet.", "Sie können jederzeit neu bestellen."],
            };

    case "order_cancelled":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Cancelled`,
            title: `${restaurant} · Cancelled`,
            preheader: `Order ${code} cancelled.`,
            bodyLines: [hello, `Order ${code} at ${restaurant} was cancelled.`, "If you paid online, the refund will appear according to your bank / provider."],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · İptal`,
              title: `${restaurant} · İptal`,
              preheader: `${code} iptal edildi.`,
              bodyLines: [hello, `${restaurant} için ${code} siparişi iptal edildi.`, "Online ödediyseniz iade banka / sağlayıcı sürelerine göre görünür."],
            }
          : {
              subject: `Lieferway · ${code} · Storniert`,
              title: `${restaurant} · Storniert`,
              preheader: `Bestellung ${code} storniert.`,
              bodyLines: [hello, `Bestellung ${code} bei ${restaurant} wurde storniert.`, "Bei Online-Zahlung erscheint die Erstattung je nach Bank / Anbieter."],
            };

    case "order_refunded":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Refund`,
            title: `${restaurant} · Refund`,
            preheader: ctx.amountLabel ? `Refund ${ctx.amountLabel}` : `Refund for ${code}`,
            bodyLines: [hello, `A refund for order ${code} at ${restaurant} was processed${ctx.amountLabel ? ` (${ctx.amountLabel})` : ""}.`, "It can take a few business days to appear on your statement."],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · İade`,
              title: `${restaurant} · İade`,
              preheader: ctx.amountLabel ? `İade ${ctx.amountLabel}` : `${code} iadesi`,
              bodyLines: [hello, `${restaurant} ${code} siparişi için iade işleme alındı${ctx.amountLabel ? ` (${ctx.amountLabel})` : ""}.`, "Hesabınızda görünmesi birkaç iş günü sürebilir."],
            }
          : {
              subject: `Lieferway · ${code} · Erstattung`,
              title: `${restaurant} · Erstattung`,
              preheader: ctx.amountLabel ? `Erstattung ${ctx.amountLabel}` : `Erstattung ${code}`,
              bodyLines: [hello, `Für Bestellung ${code} bei ${restaurant} wurde eine Erstattung veranlasst${ctx.amountLabel ? ` (${ctx.amountLabel})` : ""}.`, "Bis zur Anzeige auf dem Kontoauszug können einige Werktage vergehen."],
            };

    case "payment_failed":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code || "Order"} · Payment failed`,
            title: "Payment failed",
            preheader: "Please try again or use another method.",
            bodyLines: [hello, code ? `Payment for order ${code} at ${restaurant} did not go through.` : `Payment at ${restaurant} did not go through.`, "Please try again or choose another payment method. No charge was completed."],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code || "Sipariş"} · Ödeme başarısız`,
              title: "Ödeme başarısız",
              preheader: "Lütfen tekrar deneyin veya başka yöntem seçin.",
              bodyLines: [hello, code ? `${restaurant} ${code} siparişi için ödeme tamamlanamadı.` : `${restaurant} için ödeme tamamlanamadı.`, "Lütfen tekrar deneyin veya başka bir ödeme yöntemi seçin. Ücret alınmadı."],
            }
          : {
              subject: `Lieferway · ${code || "Bestellung"} · Zahlung fehlgeschlagen`,
              title: "Zahlung fehlgeschlagen",
              preheader: "Bitte erneut versuchen oder anderes Mittel wählen.",
              bodyLines: [hello, code ? `Die Zahlung für Bestellung ${code} bei ${restaurant} ist fehlgeschlagen.` : `Die Zahlung bei ${restaurant} ist fehlgeschlagen.`, "Bitte versuchen Sie es erneut oder wählen Sie ein anderes Zahlungsmittel. Es wurde nichts abgebucht."],
            };

    case "order_ready":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · Ready`,
            title: pickup ? `${restaurant} · Ready for pickup` : `${restaurant} · Ready`,
            preheader: pickup ? "Ready for pickup." : "Order is ready.",
            bodyLines: [hello, pickup ? `Order ${code} is ready for pickup at ${restaurant}.` : `Order ${code} at ${restaurant} is ready.`],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · Hazır`,
              title: pickup ? `${restaurant} · Teslime hazır` : `${restaurant} · Hazır`,
              preheader: pickup ? "Teslime hazır." : "Sipariş hazır.",
              bodyLines: [hello, pickup ? `${code} siparişi ${restaurant} adresinde teslime hazır.` : `${restaurant} ${code} siparişi hazır.`],
            }
          : {
              subject: `Lieferway · ${code} · Fertig`,
              title: pickup ? `${restaurant} · Abholbereit` : `${restaurant} · Fertig`,
              preheader: pickup ? "Zur Abholung bereit." : "Bestellung ist fertig.",
              bodyLines: [hello, pickup ? `Bestellung ${code} ist bei ${restaurant} zur Abholung bereit.` : `Bestellung ${code} bei ${restaurant} ist fertig.`],
            };

    case "order_out_for_delivery":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · On the way`,
            title: `${restaurant} · On the way`,
            preheader: "Your order is out for delivery.",
            bodyLines: [hello, `Order ${code} from ${restaurant} is on the way to you.`],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · Yolda`,
              title: `${restaurant} · Yolda`,
              preheader: "Siparişiniz yola çıktı.",
              bodyLines: [hello, `${restaurant} ${code} siparişi size doğru yola çıktı.`],
            }
          : {
              subject: `Lieferway · ${code} · Unterwegs`,
              title: `${restaurant} · Unterwegs`,
              preheader: "Ihre Bestellung ist unterwegs.",
              bodyLines: [hello, `Bestellung ${code} von ${restaurant} ist zu Ihnen unterwegs.`],
            };

    case "order_completed":
      return locale === "en"
        ? {
            subject: `Lieferway · ${code} · ${pickup ? "Picked up" : "Delivered"}`,
            title: pickup ? `${restaurant} · Picked up` : `${restaurant} · Delivered`,
            preheader: pickup ? "Enjoy your meal." : "Delivered — enjoy.",
            bodyLines: [hello, pickup ? `Order ${code} was picked up. Enjoy your meal from ${restaurant}!` : `Order ${code} from ${restaurant} was delivered. Enjoy!`],
          }
        : locale === "tr"
          ? {
              subject: `Lieferway · ${code} · ${pickup ? "Teslim alındı" : "Teslim edildi"}`,
              title: pickup ? `${restaurant} · Teslim alındı` : `${restaurant} · Teslim edildi`,
              preheader: "Afiyet olsun.",
              bodyLines: [hello, pickup ? `${code} siparişi teslim alındı. ${restaurant} afiyet olsun!` : `${restaurant} ${code} siparişi teslim edildi. Afiyet olsun!`],
            }
          : {
              subject: `Lieferway · ${code} · ${pickup ? "Abgeholt" : "Geliefert"}`,
              title: pickup ? `${restaurant} · Abgeholt` : `${restaurant} · Geliefert`,
              preheader: "Guten Appetit.",
              bodyLines: [hello, pickup ? `Bestellung ${code} wurde abgeholt. Guten Appetit von ${restaurant}!` : `Bestellung ${code} von ${restaurant} wurde geliefert. Guten Appetit!`],
            };

    case "partner_application_received":
      return {
        subject: "Lieferway · Partneranfrage erhalten",
        title: "Partneranfrage erhalten",
        preheader: "Wir melden uns bei Ihnen.",
        bodyLines: [
          hello,
          `Wir haben Ihre Anfrage für „${ctx.businessName ?? restaurant}“ erhalten.`,
          "Unser Team prüft die Unterlagen und meldet sich per E-Mail.",
        ],
      };

    case "partner_approved":
      return {
        subject: "Lieferway · Partner freigeschaltet",
        title: "Partner freigeschaltet",
        preheader: "Ihr Restaurant ist aktiv.",
        bodyLines: [
          hello,
          `„${ctx.businessName ?? restaurant}“ ist freigeschaltet.`,
          ctx.email ? `Login-E-Mail: ${ctx.email}` : "",
          ctx.password ? `Startpasswort: ${ctx.password}` : "",
          "Bitte melden Sie sich an und ändern Sie das Passwort umgehend.",
        ].filter(Boolean),
      };

    case "restaurant_payout_summary":
      return {
        subject: "Lieferway · Auszahlungsübersicht",
        title: "Auszahlungsübersicht",
        preheader: "Wöchentliche Zusammenfassung",
        bodyLines: [
          hello,
          ctx.detail ?? "Ihre wöchentliche Auszahlungsübersicht ist verfügbar.",
          ctx.amountLabel ? `Betrag: ${ctx.amountLabel}` : "",
        ].filter(Boolean),
      };

    case "critical_payment_or_webhook_error":
      return {
        subject: "Lieferway · Kritischer Zahlungs-/Webhook-Fehler",
        title: "Kritischer Fehler",
        preheader: "Sofortige Prüfung erforderlich",
        bodyLines: [
          "Ein kritischer Fehler bei Zahlung oder Webhook ist aufgetreten.",
          ctx.detail ?? "Details siehe Logs / Monitoring.",
          ctx.orderCode ? `Bestellung: ${ctx.orderCode}` : "",
        ].filter(Boolean),
      };

    default: {
      const _exhaustive: never = eventType;
      return {
        subject: "Lieferway",
        title: "Lieferway",
        preheader: "",
        bodyLines: [String(_exhaustive)],
      };
    }
  }
}

/** Map kitchen/order status → transactional event (or null if none). */
export function orderStatusToEvent(status: string): TransactionalEventType | null {
  switch (status) {
    case "PLACED":
      return "order_created";
    case "ACCEPTED":
    case "PREPARING":
      return "order_accepted";
    case "REJECTED":
      return "order_rejected";
    case "CANCELLED":
      return "order_cancelled";
    case "READY":
      return "order_ready";
    case "OUT_FOR_DELIVERY":
      return "order_out_for_delivery";
    case "DELIVERED":
      return "order_completed";
    default:
      return null;
  }
}

// silence unused helper in case tree-shake warnings
void orderLink;
