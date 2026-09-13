import { sendTransactionalEmail } from "./service";
import type { EmailAttachment, SendTransactionalResult, TransactionalEventType } from "./types";
import type { TemplateVars } from "./templates";
import type { EmailLocale } from "./types";

function appBase() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:43123").replace(/\/$/, "");
}

export async function sendUserRegistered(opts: {
  userId: string;
  email: string;
  name: string;
  locale?: EmailLocale;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "user_registered",
    eventKey: `user_registered:${opts.userId}`,
    to: opts.email,
    vars: {
      locale: opts.locale,
      name: opts.name,
      email: opts.email,
      link: `${appBase()}/account`,
    },
  });
}

/** TODO: wire when email verification tokens exist. */
export async function sendEmailVerification(opts: {
  userId: string;
  email: string;
  name?: string;
  token: string;
  locale?: EmailLocale;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "email_verification",
    eventKey: `email_verification:${opts.userId}:${opts.token}`,
    to: opts.email,
    vars: {
      locale: opts.locale,
      name: opts.name,
      email: opts.email,
      link: `${appBase()}/api/auth/verify?token=${encodeURIComponent(opts.token)}`,
      detail: undefined,
    },
  });
}

/** TODO: wire when password-reset tokens exist. */
export async function sendPasswordReset(opts: {
  userId: string;
  email: string;
  name?: string;
  token: string;
  locale?: EmailLocale;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "password_reset",
    eventKey: `password_reset:${opts.userId}:${opts.token}`,
    to: opts.email,
    vars: {
      locale: opts.locale,
      name: opts.name,
      link: `${appBase()}/login/reset?token=${encodeURIComponent(opts.token)}`,
    },
  });
}

export async function sendOrderStatusEmail(opts: {
  eventType: Extract<
    TransactionalEventType,
    | "order_created"
    | "order_accepted"
    | "order_rejected"
    | "order_cancelled"
    | "order_ready"
    | "order_out_for_delivery"
    | "order_completed"
  >;
  orderId: string;
  status: string;
  to: string;
  vars: TemplateVars;
  attachments?: EmailAttachment[];
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: opts.eventType,
    eventKey: `${opts.eventType}:${opts.orderId}:${opts.status}`,
    to: opts.to,
    vars: {
      ...opts.vars,
      orderId: opts.orderId,
      link: opts.vars.link ?? `${appBase()}/orders/${opts.orderId}`,
    },
    attachments: opts.attachments,
    metadata: { orderId: opts.orderId, status: opts.status },
  });
}

export async function sendPaymentFailed(opts: {
  orderId: string;
  paymentIntentId: string;
  to: string;
  vars: TemplateVars;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "payment_failed",
    eventKey: `payment_failed:${opts.orderId}:${opts.paymentIntentId}`,
    to: opts.to,
    vars: {
      ...opts.vars,
      orderId: opts.orderId,
      link: opts.vars.link ?? `${appBase()}/orders/${opts.orderId}`,
    },
    metadata: { orderId: opts.orderId, paymentIntentId: opts.paymentIntentId },
  });
}

export async function sendOrderRefunded(opts: {
  orderId: string;
  stripeRefundId: string;
  to: string;
  vars: TemplateVars;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "order_refunded",
    eventKey: `order_refunded:${opts.orderId}:${opts.stripeRefundId}`,
    to: opts.to,
    vars: {
      ...opts.vars,
      orderId: opts.orderId,
      link: opts.vars.link ?? `${appBase()}/orders/${opts.orderId}`,
    },
    metadata: { orderId: opts.orderId, stripeRefundId: opts.stripeRefundId },
  });
}

export async function sendPartnerApplicationReceived(opts: {
  applicationId: string;
  email: string;
  contactName: string;
  businessName: string;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "partner_application_received",
    eventKey: `partner_application_received:${opts.applicationId}`,
    to: opts.email,
    vars: {
      locale: "de",
      name: opts.contactName,
      businessName: opts.businessName,
      link: `${appBase()}/partner/anmelden`,
    },
  });
}

export async function sendPartnerApproved(opts: {
  applicationId: string;
  email: string;
  contactName: string;
  businessName: string;
  password: string;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "partner_approved",
    eventKey: `partner_approved:${opts.applicationId}`,
    to: opts.email,
    vars: {
      locale: "de",
      name: opts.contactName,
      businessName: opts.businessName,
      email: opts.email,
      password: opts.password,
      link: `${appBase()}/login`,
    },
  });
}

/** TODO: weekly cron / admin action. */
export async function sendRestaurantPayoutSummary(opts: {
  restaurantId: string;
  weekStartIso: string;
  to: string;
  vars: TemplateVars;
}): Promise<SendTransactionalResult> {
  return sendTransactionalEmail({
    eventType: "restaurant_payout_summary",
    eventKey: `restaurant_payout_summary:${opts.restaurantId}:${opts.weekStartIso}`,
    to: opts.to,
    vars: opts.vars,
    metadata: { restaurantId: opts.restaurantId, weekStartIso: opts.weekStartIso },
  });
}

export async function sendCriticalPaymentOrWebhookError(opts: {
  dedupeKey: string;
  detail: string;
  orderCode?: string;
  to?: string;
}): Promise<SendTransactionalResult> {
  const to =
    opts.to?.trim() ||
    process.env.EMAIL_OPS_TO?.trim() ||
    process.env.MAIL_OPS_TO?.trim() ||
    "info@lieferway.de";
  return sendTransactionalEmail({
    eventType: "critical_payment_or_webhook_error",
    eventKey: `critical_payment_or_webhook_error:${opts.dedupeKey}`,
    to,
    vars: {
      locale: "de",
      detail: opts.detail,
      orderCode: opts.orderCode,
    },
    metadata: { dedupeKey: opts.dedupeKey },
  });
}
