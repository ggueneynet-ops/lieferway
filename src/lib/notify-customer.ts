import { prisma } from "@/lib/prisma";
import { sendCustomerEmail } from "@/lib/mail";
import { interpolate, parseLocale, STATUS_LABEL, t as dict } from "@/lib/i18n";

const NOTIFY_STATUSES = new Set([
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
]);

function noticeCopy(status: string, locale: ReturnType<typeof parseLocale>, vars: Record<string, string>) {
  const t = dict(locale);
  const template =
    status === "PLACED"
      ? t.orderNoticePlaced
      : status === "REJECTED"
        ? t.orderNoticeRejected
        : status === "READY"
          ? t.orderNoticeReady
          : status === "OUT_FOR_DELIVERY"
            ? t.orderNoticeOut
            : status === "DELIVERED"
              ? t.orderNoticeDelivered
              : t.orderNoticeAccepted;
  const statusLabel =
    status === "PREPARING" || status === "ACCEPTED"
      ? STATUS_LABEL[locale].ACCEPTED
      : (STATUS_LABEL[locale][status] ?? status);
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
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:43123").replace(/\/$/, "");
    const copy = noticeCopy(status, locale, {
      restaurant: order.restaurant.name,
      code: order.shortCode,
      min: String(order.prepMinutes ?? 25),
      email: order.customer.email,
    });
    const subject = `Lieferway · ${order.shortCode} · ${copy.title}`;
    const link = `${appUrl}/orders/${order.id}`;
    const mailed = await sendCustomerEmail({
      to: order.customer.email,
      subject,
      text: `${copy.title}\n\n${copy.body}\n\n${link}\n`,
      html: `<p><strong>${escapeHtml(copy.title)}</strong></p><p>${escapeHtml(copy.body)}</p><p><a href="${link}">Bestellung ansehen</a></p>`,
    });

    try {
      await prisma.customerNotice.create({
        data: {
          userId: order.customer.id,
          orderId: order.id,
          status,
          title: copy.title,
          body: copy.body,
          emailTo: order.customer.email,
          emailSent: mailed.ok,
          emailChannel: mailed.channel,
        },
      });
    } catch (createErr) {
      const code = typeof createErr === "object" && createErr && "code" in createErr ? String(createErr.code) : "";
      if (code !== "P2002") throw createErr;
    }
  } catch (e) {
    console.error("notifyCustomerOfOrderStatus", e);
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
