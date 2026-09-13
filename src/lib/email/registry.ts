import type { TransactionalEventType } from "./types";

/**
 * Registry of transactional events.
 * `wired` = called from production flows.
 * `todo` = template + sender exist; no product flow yet.
 */
export const EMAIL_EVENT_REGISTRY: Record<
  TransactionalEventType,
  { status: "wired" | "todo"; notes: string }
> = {
  user_registered: { status: "wired", notes: "POST /api/auth/register" },
  email_verification: { status: "todo", notes: "No email-verification flow in codebase yet" },
  password_reset: { status: "wired", notes: "POST /api/auth/password-reset/request → /login/reset" },
  order_created: { status: "wired", notes: "notifyCustomerOfOrderStatus(PLACED) / Stripe PI succeeded" },
  order_accepted: { status: "wired", notes: "notifyCustomerOfOrderStatus(ACCEPTED|PREPARING)" },
  order_rejected: { status: "wired", notes: "notifyCustomerOfOrderStatus(REJECTED)" },
  order_cancelled: { status: "wired", notes: "notifyCustomerOfOrderStatus(CANCELLED)" },
  order_refunded: { status: "wired", notes: "applyRefundToOrder → sendOrderRefunded + notifyCustomerOfOrderStatus(REFUNDED) notice" },
  payment_failed: { status: "wired", notes: "handlePaymentIntentFailed" },
  order_ready: { status: "wired", notes: "notifyCustomerOfOrderStatus(READY)" },
  order_out_for_delivery: { status: "wired", notes: "notifyCustomerOfOrderStatus(OUT_FOR_DELIVERY)" },
  order_completed: { status: "wired", notes: "notifyCustomerOfOrderStatus(DELIVERED)" },
  partner_application_received: { status: "wired", notes: "submitPartnerApplication" },
  partner_approved: { status: "wired", notes: "approvePartnerApplication" },
  restaurant_payout_summary: { status: "todo", notes: "Payout regenerate exists; no partner email job yet" },
  critical_payment_or_webhook_error: {
    status: "wired",
    notes: "src/lib/alerts.ts → EMAIL_OPS_TO (webhook/payment/refund/order/mail/DB/printer)",
  },
};
