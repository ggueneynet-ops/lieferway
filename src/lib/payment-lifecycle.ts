/**
 * Payment cancel / refund lifecycle for Lieferway.
 *
 * Architecture decision (do not blind-refactor to auth-hold):
 * Current Stripe Connect flow creates destination PaymentIntents that are
 * captured on customer confirmation. Kitchen only sees orders after
 * payment_intent.succeeded → PLACED + PAID. Auth-hold (manual capture) would
 * require changing PI creation, kitchen visibility, and webhooks — out of scope.
 *
 * Mapping (requested → existing enums):
 *   pending        → PENDING
 *   authorized     → unused (no auth-hold)
 *   captured       → PAID
 *   failed         → FAILED
 *   refund_pending → REFUND_PENDING
 *   refunded       → REFUNDED / PARTIALLY_REFUNDED
 *
 * Release rules:
 *   unpaid PENDING / PENDING_PAYMENT → cancel PaymentIntent
 *   PAID / PARTIALLY_REFUNDED / DISPUTED → Stripe refund (+ reverse_transfer)
 *   CASH → no Stripe call; order status change only
 */
import { prisma } from "@/lib/prisma";
import { cancelPaymentIntent } from "@/lib/payments";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { applyRefundToOrder } from "@/lib/stripe-webhooks";
import { remainingOrderTotals } from "@/lib/stripe-money";
import { restaurantAcceptTimeoutMinutes } from "@/lib/constants";

import {
  acceptTimeoutCutoff,
  refundIdempotencyKey,
  type ReleaseReason,
} from "@/lib/payment-lifecycle-shared";

export type { ReleaseReason };
export { acceptTimeoutCutoff, refundIdempotencyKey };

export type ReleaseResult =
  | { ok: true; action: "none" | "cancel_pi" | "refund" | "cash_noop"; detail?: string; stripeId?: string | null }
  | { ok: false; action: "refund" | "cancel_pi"; error: string; logged: true };

const REFUNDABLE = new Set(["PAID", "PARTIALLY_REFUNDED", "DISPUTED", "REFUND_PENDING"]);

async function logRelease(opts: {
  orderId: string;
  action: string;
  reason: string;
  status: "OK" | "FAILED" | "SKIPPED";
  detail?: string | null;
  amountCents?: number | null;
  stripeId?: string | null;
}) {
  try {
    await prisma.paymentReleaseLog.create({
      data: {
        orderId: opts.orderId,
        action: opts.action,
        reason: opts.reason,
        status: opts.status,
        detail: opts.detail ?? null,
        amountCents: opts.amountCents ?? null,
        stripeId: opts.stripeId ?? null,
      },
    });
  } catch (e) {
    console.error("[payment-lifecycle] log failed", e);
  }
  if (opts.status === "FAILED") {
    console.error("[payment-lifecycle] FAILED", {
      orderId: opts.orderId,
      action: opts.action,
      reason: opts.reason,
      detail: opts.detail,
      amountCents: opts.amountCents,
    });
  }
}

/** Cancel unpaid PI or refund captured payment. Idempotent via Stripe keys + logs. */
export async function releaseOrderPayment(opts: {
  orderId: string;
  reason: ReleaseReason;
  amountCents?: number;
  full?: boolean;
  stripeReason?: "requested_by_customer" | "duplicate" | "fraudulent";
}): Promise<ReleaseResult> {
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) {
    return { ok: false, action: "refund", error: "order_not_found", logged: true };
  }

  if (order.paymentMethod === "CASH") {
    await logRelease({
      orderId: order.id,
      action: "CASH_NOOP",
      reason: opts.reason,
      status: "SKIPPED",
      detail: "cash_no_stripe",
    });
    return { ok: true, action: "cash_noop", detail: "cash" };
  }

  const remaining = remainingOrderTotals(order);
  const unpaid =
    order.paymentStatus === "PENDING" ||
    order.paymentStatus === "FAILED" ||
    order.status === "PENDING_PAYMENT";

  // Unpaid / not yet captured → cancel PI
  if (unpaid && !REFUNDABLE.has(order.paymentStatus)) {
    if (order.stripePaymentIntentId) {
      try {
        await cancelPaymentIntent(order.stripePaymentIntentId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await logRelease({
          orderId: order.id,
          action: "CANCEL_PI",
          reason: opts.reason,
          status: "FAILED",
          detail: msg,
          stripeId: order.stripePaymentIntentId,
        });
        return { ok: false, action: "cancel_pi", error: msg, logged: true };
      }
    }
    if (order.paymentStatus !== "FAILED" && order.paymentStatus !== "REFUNDED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", payoutStatus: "NONE" },
      });
    }
    await logRelease({
      orderId: order.id,
      action: "CANCEL_PI",
      reason: opts.reason,
      status: "OK",
      stripeId: order.stripePaymentIntentId,
    });
    return { ok: true, action: "cancel_pi", stripeId: order.stripePaymentIntentId };
  }

  // Already fully refunded
  if (order.paymentStatus === "REFUNDED" || remaining.remainingTotalCents <= 0) {
    await logRelease({
      orderId: order.id,
      action: "REFUND",
      reason: opts.reason,
      status: "SKIPPED",
      detail: "already_refunded",
    });
    return { ok: true, action: "none", detail: "already_refunded" };
  }

  if (!REFUNDABLE.has(order.paymentStatus)) {
    await logRelease({
      orderId: order.id,
      action: "REFUND",
      reason: opts.reason,
      status: "SKIPPED",
      detail: `not_refundable:${order.paymentStatus}`,
    });
    return { ok: true, action: "none", detail: `not_refundable:${order.paymentStatus}` };
  }

  if (!order.stripePaymentIntentId || !isStripeConfigured()) {
    const err = "no_stripe_payment";
    await logRelease({
      orderId: order.id,
      action: "REFUND",
      reason: opts.reason,
      status: "FAILED",
      detail: err,
      amountCents: remaining.remainingTotalCents,
    });
    return { ok: false, action: "refund", error: err, logged: true };
  }

  const amount =
    opts.full || !opts.amountCents ? remaining.remainingTotalCents : Math.min(opts.amountCents, remaining.remainingTotalCents);
  if (amount <= 0) {
    return { ok: true, action: "none", detail: "zero_amount" };
  }

  const idempotencyKey = refundIdempotencyKey(order.id, opts.reason, amount);

  // Mark refund_pending before Stripe call (consistent state)
  if (order.paymentStatus !== "REFUND_PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUND_PENDING" },
    });
  }

  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount,
        reason: opts.stripeReason,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          orderId: order.id,
          reason: opts.reason,
          shortCode: order.shortCode,
        },
      },
      { idempotencyKey },
    );

    await applyRefundToOrder({
      orderId: order.id,
      stripeRefundId: refund.id,
      amountCents: refund.amount,
      status: refund.status ?? "succeeded",
      reason: refund.reason ?? opts.reason,
    });

    await logRelease({
      orderId: order.id,
      action: "REFUND",
      reason: opts.reason,
      status: "OK",
      amountCents: refund.amount,
      stripeId: refund.id,
      detail: refund.status ?? "succeeded",
    });

    return { ok: true, action: "refund", stripeId: refund.id, detail: refund.status ?? undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRelease({
      orderId: order.id,
      action: "REFUND",
      reason: opts.reason,
      status: "FAILED",
      detail: msg,
      amountCents: amount,
      stripeId: order.stripePaymentIntentId,
    });
    // Leave REFUND_PENDING so admin can retry; do not pretend success
    return { ok: false, action: "refund", error: msg, logged: true };
  }
}

/** Orders waiting for restaurant accept past the timeout. */
export async function findExpiredPlacedOrders(limit = 50) {
  const cutoff = acceptTimeoutCutoff();
  return prisma.order.findMany({
    where: {
      status: "PLACED",
      acceptedAt: null,
      OR: [{ placedAt: { lt: cutoff } }, { placedAt: null, createdAt: { lt: cutoff } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      shortCode: true,
      paymentMethod: true,
      paymentStatus: true,
      restaurantId: true,
      customerId: true,
      placedAt: true,
      createdAt: true,
    },
  });
}

/**
 * Auto-expire one PLACED order: REJECTED + cancel/refund + notify.
 * Returns null if the row was already claimed (status changed).
 */
export async function expirePlacedOrder(orderId: string) {
  const now = new Date();
  // Claim: only transition PLACED → REJECTED once
  const claimed = await prisma.$executeRawUnsafe(
    `UPDATE "Order" SET "status" = $1, "updatedAt" = $2 WHERE "id" = $3 AND "status" = $4 AND "acceptedAt" IS NULL`,
    "REJECTED",
    now,
    orderId,
    "PLACED",
  );
  if (!claimed) {
    return { skipped: true as const, reason: "not_placed" };
  }

  const release = await releaseOrderPayment({
    orderId,
    reason: "restaurant_timeout",
    full: true,
    stripeReason: "requested_by_customer",
  });

  const { reverseCouponUsageForOrder } = await import("@/lib/coupons");
  await reverseCouponUsageForOrder(orderId);
  const { reverseWayPointsForOrder } = await import("@/lib/waypoints-service");
  await reverseWayPointsForOrder(orderId, "reject");

  const { notifyRestaurantOrders } = await import("@/lib/order-events");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { restaurantId: true },
  });
  if (order) notifyRestaurantOrders(order.restaurantId);

  const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
  // Use REJECTED notice (existing copy); also log expire intent for email stub
  console.info("[payment-lifecycle] notify customer of restaurant_timeout", { orderId });
  await notifyCustomerOfOrderStatus(orderId, "REJECTED");

  return { skipped: false as const, release };
}

export async function expireStalePlacedOrders(limit = 50) {
  const stale = await findExpiredPlacedOrders(limit);
  const results = [];
  for (const row of stale) {
    try {
      results.push({ orderId: row.id, shortCode: row.shortCode, ...(await expirePlacedOrder(row.id)) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[payment-lifecycle] expire failed", row.id, msg);
      await logRelease({
        orderId: row.id,
        action: "EXPIRE",
        reason: "restaurant_timeout",
        status: "FAILED",
        detail: msg,
      });
      results.push({ orderId: row.id, shortCode: row.shortCode, skipped: false, error: msg });
    }
  }
  return { scanned: stale.length, results, timeoutMinutes: restaurantAcceptTimeoutMinutes() };
}
