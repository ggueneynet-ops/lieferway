import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendCustomerEmail } from "@/lib/mail";
import { interpolate, orderStatusLabel, parseLocale, t as dict } from "@/lib/i18n";
import { isPickup } from "@/lib/fulfillment";

function noticeId() {
  return `c${randomBytes(12).toString("hex")}`;
}

const NOTIFY_STATUSES = new Set([
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
]);

function noticeCopy(
  status: string,
  locale: ReturnType<typeof parseLocale>,
  vars: Record<string, string>,
  fulfillment?: string | null,
) {
  const t = dict(locale);
  const pickup = isPickup(fulfillment);
  const template =
    status === "PLACED"
      ? t.orderNoticePlaced
      : status === "REJECTED"
        ? t.orderNoticeRejected
        : status === "CANCELLED"
          ? t.orderNoticeCancelled
          : status === "READY"
          ? pickup
            ? t.orderNoticePickupReady
            : t.orderNoticeReady
          : status === "OUT_FOR_DELIVERY"
            ? t.orderNoticeOut
            : status === "DELIVERED"
              ? pickup
                ? t.orderNoticePickedUp
                : t.orderNoticeDelivered
              : t.orderNoticeAccepted;
  const statusLabel = orderStatusLabel(
    locale,
    status === "PREPARING" || status === "ACCEPTED" ? "ACCEPTED" : status,
    fulfillment,
  );
  return {
    title: `${vars.restaurant} · ${statusLabel}`,
    body: interpolate(template, vars),
  };
}

export async function notifyCustomerOfOrderStatus(orderId: string, status: string) {
  if (!NOTIFY_STATUSES.has(status)) return;
  try {
    const existing = await prisma.customerNotice.findUnique({
      where: { orderId_status: { orderId, status } },
    });
    if (existing) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, email: true, locale: true } },
        restaurant: { select: { name: true } },
      },
    });
    if (!order) return;

    const locale = parseLocale(order.customer.locale);
    const t = dict(locale);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:43123").replace(/\/$/, "");
    const copy = noticeCopy(status, locale, {
      restaurant: order.restaurant.name,
      code: order.shortCode,
      min: String(order.prepMinutes ?? 25),
      email: order.customer.email,
    }, order.fulfillmentType);
    const subject = `Lieferway · ${order.shortCode} · ${copy.title}`;
    const link = `${appUrl}/orders/${order.id}`;
    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
    let invoiceLine = "";
    if (status === "PLACED") {
      try {
        const { ensureCustomerInvoice, readInvoicePdf } = await import("@/lib/invoices");
        const invoice = await ensureCustomerInvoice(order.id);
        const pdf = await readInvoicePdf(invoice);
        attachments = [{ filename: `${invoice.number}.pdf`, content: pdf, contentType: "application/pdf" }];
        invoiceLine = `\n${interpolate(t.invoiceEmailBody, { code: order.shortCode, restaurant: order.restaurant.name })}\n`;
      } catch (invErr) {
        console.error("customer invoice", invErr);
      }
    }
    const mailed = await sendCustomerEmail({
      to: order.customer.email,
      subject,
      text: `${copy.title}\n\n${copy.body}${invoiceLine}\n\n${link}\n`,
      html: `<p><strong>${escapeHtml(copy.title)}</strong></p><p>${escapeHtml(copy.body)}</p>${
        invoiceLine ? `<p>${escapeHtml(invoiceLine.trim())}</p>` : ""
      }<p><a href="${link}">Bestellung ansehen</a></p>`,
      attachments,
    });

    // Bound SQL: Prisma 6's long-lived Next worker can reject newer scalar
    // fields on create() even after db push (same pattern as kitchen accept).
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "CustomerNotice" ("id","userId","orderId","status","title","body","emailTo","emailSent","emailChannel","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        noticeId(),
        order.customer.id,
        order.id,
        status,
        copy.title,
        copy.body,
        order.customer.email,
        mailed.ok,
        mailed.channel,
        new Date(),
      );
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : String(createErr);
      if (!msg.includes("UNIQUE") && !msg.includes("unique")) throw createErr;
    }
  } catch (e) {
    console.error("notifyCustomerOfOrderStatus", e);
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
