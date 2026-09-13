import { restaurantAcceptTimeoutMinutes } from "@/lib/constants";

export type ReleaseReason =
  | "restaurant_reject"
  | "customer_cancel"
  | "restaurant_timeout"
  | "admin_refund"
  | "payment_canceled";

export function refundIdempotencyKey(orderId: string, reason: ReleaseReason, amountCents: number) {
  return `lw_refund_${orderId}_${reason}_${amountCents}`.slice(0, 255);
}

export function acceptTimeoutCutoff(now = new Date()) {
  const mins = restaurantAcceptTimeoutMinutes();
  return new Date(now.getTime() - mins * 60_000);
}
