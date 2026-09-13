import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { interpolate, orderStatusLabel, parseLocale, t as dict } from "@/lib/i18n";
import { isPickup } from "@/lib/fulfillment";
import { orderStatusToEvent, sendOrderStatusEmail } from "@/lib/email";

function noticeId() {
  return `c${randomBytes(12).toString("hex")}`;
}

/** Statuses that create a CustomerNotice (in-app + browser poller). Email via orderStatusToEvent when mapped. */
const NOTIFY_STATUSES = new Set([
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
  "REFUNDED",
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
          : status === "REFUNDED"
            ? t.orderNoticeRefunded
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
                  : status === "PREPARING"
                    ? t.orderNoticePreparing
                    : t.orderNoticeAccepted;
  const statusLabel = orderStatusLabel(locale, status, fulfillment);
  return {
    title: `${vars.restaurant} · ${statusLabel}`,
    body: interpolate(template, vars),
  };
}

/**
 * Shared order-status notification hook used by kitchen accept, order PATCH,
 * Stripe PLACED, cancel/reject, and (notice-only) full refunds.
 * Creates at most one CustomerNotice per (orderId, status). Email is sent when
 * orderStatusToEvent(status) is set — REFUNDED skips email here (sendOrderRefunded already ran).
 */
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
        customer: { select: { id: true, email: true, name: true, locale: true } },
        restaurant: { select: { name: true } },
      },
    });
    if (!order) return;

    const locale = parseLocale(order.customer.locale);
    const t = dict(locale);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:43123").replace(/\/$/, "");
    const copy = noticeCopy(
      status,
      locale,
      {
        restaurant: order.restaurant.name,
        code: order.shortCode,
        min: String(order.prepMinutes ?? 25),
        email: order.customer.email,
      },
      order.fulfillmentType,
    );
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

    const eventType = orderStatusToEvent(status);
    let mailed = { ok: false, mock: true, channel: "none" as string };
    if (eventType) {
      const result = await sendOrderStatusEmail({
        eventType: eventType as
          | "order_created"
          | "order_accepted"
          | "order_rejected"
          | "order_cancelled"
          | "order_ready"
          | "order_out_for_delivery"
          | "order_completed",
        orderId: order.id,
        status,
        to: order.customer.email,
        vars: {
          locale,
          name: order.customer.name,
          restaurant: order.restaurant.name,
          orderCode: order.shortCode,
          prepMinutes: order.prepMinutes ?? 25,
          fulfillment: order.fulfillmentType,
          link,
          detail: invoiceLine.trim() || undefined,
        },
        attachments,
      });
      mailed = { ok: result.ok || result.skipped, mock: result.mock, channel: result.channel };
    } else if (status === "REFUNDED") {
      // Email already sent via sendOrderRefunded; notice is for in-app / browser only.
      mailed = { ok: true, mock: false, channel: "order_refunded" };
    }

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "CustomerNotice" ("id","userId","orderId","status","title","body","emailTo","emailSent","emailChannel","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        noticeId(),
        order.customer.id,
        order.id,
        status,
        copy.title,
        copy.body + (invoiceLine ? ` ${invoiceLine.trim()}` : ""),
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
