import { prisma } from "@/lib/prisma";
import { sendCustomerEmail } from "@/lib/mail";
import { interpolate, parseLocale, STATUS_LABEL, t as dict } from "@/lib/i18n";

const NOTIFY_STATUSES = new Set([
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
]);

function noticeCopy(status: string, locale: ReturnType<typeof parseLocale>, vars: Record<string, string>) {
  const t = dict(locale);
  const key =
    status === "PREPARING"
      ? t.orderNoticeAccepted
      : status === "READY"
        ? t.orderNoticeReady
        : status === "OUT_FOR_DELIVERY"
          ? t.orderNoticeOut
          : status === "DELIVERED"
            ? t.orderNoticeDelivered
            : status === "REJECTED"
              ? t.orderNoticeRejected
              : t.orderNoticeAccepted;
  return {
    title: `${vars.restaurant} · ${STATUS_LABEL[locale][status] ?? status}`,
    body: interpolate(key, vars),
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
    const copy = noticeCopy(status, locale, {
      restaurant: order.restaurant.name,
      code: order.shortCode,
      min: String(order.prepMinutes ?? 25),
      email: order.customer.email,
    });
    const subject = `Lieferway · ${order.shortCode} · ${STATUS_LABEL[locale][status] ?? status}`;
    const mailed = await sendCustomerEmail({
      to: order.customer.email,
      subject,
      text: `${copy.title}\n\n${copy.body}\n`,
    });

    await prisma.customerNotice.create({
      data: {
        userId: order.customer.id,
        orderId: order.id,
        status,
        title: copy.title,
        body: copy.body,
        emailTo: order.customer.email,
        emailSent: mailed.ok,
      },
    });
  } catch (e) {
    console.error("notifyCustomerOfOrderStatus", e);
  }
}
