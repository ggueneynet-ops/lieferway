import type Stripe from "stripe";
import { prisma } from "./prisma";
import { notifyRestaurantOrders } from "./order-events";
import { notifyCustomerOfOrderStatus } from "./notify-customer";
import { regeneratePayouts, weekStart } from "./payouts";
import { syncRestaurantByStripeAccount } from "./stripe-connect";
import { getStripe } from "./stripe";
import { paymentStatusAfterRefund, refundSlice } from "./stripe-money";
import { platformNetAfterStripeFee, stripeFeeVarianceNote } from "./stripe-fees";
import { sendCriticalPaymentOrWebhookError, sendOrderRefunded, sendPaymentFailed } from "./email";
import { formatEUR } from "./money";
import { parseLocale } from "./i18n";

export const STRIPE_WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "refund.updated",
  "charge.dispute.created",
  "charge.dispute.closed",
  "payout.paid",
  "payout.failed",
  "payout.canceled",
  "account.updated",
] as const;

export async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("unique") || msg.includes("UNIQUE")) {
      return false;
    }
    throw e;
  }
}

export async function releaseStripeEvent(eventId: string) {
  await prisma.stripeEvent.deleteMany({ where: { id: eventId } });
}

export async function markStripeEventProcessed(eventId: string) {
  await prisma.stripeEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  });
}

async function findOrderByPaymentIntent(piId: string | null | undefined) {
  if (!piId) return null;
  return prisma.order.findFirst({
    where: { stripePaymentIntentId: piId },
    include: { restaurant: { select: { id: true, ownerId: true } } },
  });
}

async function findOrderByCharge(chargeId: string | null | undefined) {
  if (!chargeId) return null;
  return prisma.order.findFirst({
    where: { stripeChargeId: chargeId },
  });
}

function chargeFromIntent(pi: Stripe.PaymentIntent): Stripe.Charge | null {
  const latest = pi.latest_charge;
  if (!latest) return null;
  if (typeof latest === "string") return null;
  return latest;
}

function stripeFeeFromCharge(charge: Stripe.Charge | null): number {
  if (!charge) return 0;
  const bt = charge.balance_transaction;
  if (bt && typeof bt !== "string" && typeof bt.fee === "number") {
    return bt.fee;
  }
  return 0;
}

function transferIdFromCharge(charge: Stripe.Charge | null): string | null {
  if (!charge) return null;
  const transfer = charge.transfer;
  if (typeof transfer === "string") return transfer;
  if (transfer && typeof transfer === "object" && "id" in transfer) {
    return String(transfer.id);
  }
  return null;
}

export async function retrieveFeeCents(chargeId: string | null): Promise<number> {
  if (!chargeId) return 0;
  try {
    const charge = await getStripe().charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });
    return stripeFeeFromCharge(charge);
  } catch {
    return 0;
  }
}

export async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return { skipped: true, reason: "order_not_found" };
  if (order.paymentStatus === "PAID" && order.status !== "PENDING_PAYMENT") {
    return { skipped: true, reason: "already_paid" };
  }

  let charge = chargeFromIntent(pi);
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : charge?.id ?? null;
  let stripeFeeActualCents = stripeFeeFromCharge(charge);
  if (chargeId && stripeFeeActualCents === 0) {
    stripeFeeActualCents = await retrieveFeeCents(chargeId);
  }
  const estimated = order.stripeFeeEstimatedCents || order.stripeFeeCents;
  const displayFee = stripeFeeActualCents > 0 ? stripeFeeActualCents : estimated;
  const transfer =
    order.restaurantTransferCents || Math.max(0, order.totalCents - order.applicationFeeCents);
  const now = new Date();
  const nextStatus = order.status === "PENDING_PAYMENT" ? "PLACED" : order.status;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      paymentStatus: "PAID",
      stripeChargeId: chargeId,
      stripeTransferId: transferIdFromCharge(charge),
      stripeFeeCents: displayFee,
      stripeFeeActualCents,
      restaurantTransferCents: transfer,
      restaurantNetCents: transfer,
      platformNetCents: platformNetAfterStripeFee(order.applicationFeeCents, displayFee),
      stripeFeeNote: stripeFeeVarianceNote(estimated, displayFee),
      payoutStatus: "PENDING",
      disputeStatus: null,
      ...(nextStatus === "PLACED" && order.status === "PENDING_PAYMENT"
        ? { placedAt: now }
        : {}),
    },
  });

  if (nextStatus === "PLACED" && order.status === "PENDING_PAYMENT") {
    notifyRestaurantOrders(order.restaurantId);
    await notifyCustomerOfOrderStatus(order.id, "PLACED");
  }
  return { ok: true, orderId: order.id, status: nextStatus, paidAt: now };
}

export async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return { skipped: true, reason: "order_not_found" };
  if (order.status !== "PENDING_PAYMENT" && order.paymentStatus === "PAID") {
    return { skipped: true, reason: "already_paid" };
  }
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "FAILED",
      payoutStatus: "UNPAID",
    },
  });
  try {
    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: { select: { email: true, name: true, locale: true } },
        restaurant: { select: { name: true } },
      },
    });
    if (full?.customer?.email) {
      await sendPaymentFailed({
        orderId: full.id,
        paymentIntentId: pi.id,
        to: full.customer.email,
        vars: {
          locale: parseLocale(full.customer.locale),
          name: full.customer.name,
          restaurant: full.restaurant.name,
          orderCode: full.shortCode,
        },
      });
    }
  } catch (mailErr) {
    console.error("stripe.payment_failed.email", mailErr);
  }
  return { ok: true, orderId: order.id, kitchen: false };
}

export async function handlePaymentIntentCanceled(pi: Stripe.PaymentIntent) {
  const order = await findOrderByPaymentIntent(pi.id);
  if (!order) return { skipped: true, reason: "order_not_found" };
  if (order.status === "PENDING_PAYMENT") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        payoutStatus: "NONE",
      },
    });
    const { reverseCouponUsageForOrder } = await import("./coupons");
    await reverseCouponUsageForOrder(order.id);
    const { reverseWayPointsForOrder } = await import("./waypoints-service");
    await reverseWayPointsForOrder(order.id, "cancel");
  }
  return { ok: true, orderId: order.id };
}

export async function applyRefundToOrder(opts: {
  orderId: string;
  stripeRefundId: string;
  amountCents: number;
  status: string;
  reason?: string | null;
}) {
  const existing = await prisma.stripeRefund.findUnique({
    where: { stripeRefundId: opts.stripeRefundId },
  });
  const order = await prisma.order.findUnique({ where: { id: opts.orderId } });
  if (!order) return { skipped: true, reason: "order_not_found" };

  if (existing) {
    if (existing.status === opts.status) return { skipped: true, reason: "refund_seen" };
    await prisma.stripeRefund.update({
      where: { id: existing.id },
      data: { status: opts.status, reason: opts.reason ?? existing.reason },
    });
    return { ok: true, orderId: order.id, updated: true };
  }

  const succeeded = opts.status === "succeeded" || opts.status === "SUCCEEDED";
  if (!succeeded) {
    await prisma.stripeRefund.create({
      data: {
        stripeRefundId: opts.stripeRefundId,
        orderId: order.id,
        amountCents: opts.amountCents,
        status: opts.status.toUpperCase(),
        reason: opts.reason,
      },
    });
    if (order.paymentStatus !== "REFUNDED" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUND_PENDING" },
      });
    }
    return { ok: true, orderId: order.id, pending: true };
  }

  const slice = refundSlice({
    refundAmountCents: opts.amountCents,
    totalCents: order.totalCents,
    commissionCents: order.commissionCents,
    restaurantNetCents: order.restaurantNetCents,
    stripeFeeCents: order.stripeFeeCents,
    refundedCents: order.refundedCents,
    refundedCommissionCents: order.refundedCommissionCents,
    refundedRestaurantNetCents: order.refundedRestaurantNetCents,
    refundedStripeFeeCents: order.refundedStripeFeeCents,
  });

  await prisma.$transaction([
    prisma.stripeRefund.create({
      data: {
        stripeRefundId: opts.stripeRefundId,
        orderId: order.id,
        amountCents: slice.amountCents,
        status: "SUCCEEDED",
        reason: opts.reason,
        commissionReversalCents: slice.commissionReversalCents,
        restaurantNetReversalCents: slice.restaurantNetReversalCents,
        stripeFeeReversalCents: slice.stripeFeeReversalCents,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: {
        refundedCents: order.refundedCents + slice.amountCents,
        refundedCommissionCents: order.refundedCommissionCents + slice.commissionReversalCents,
        refundedRestaurantNetCents: order.refundedRestaurantNetCents + slice.restaurantNetReversalCents,
        refundedStripeFeeCents: order.refundedStripeFeeCents + slice.stripeFeeReversalCents,
        paymentStatus: paymentStatusAfterRefund(
          order.refundedCents + slice.amountCents,
          order.totalCents,
        ),
        payoutStatus:
          order.refundedCents + slice.amountCents >= order.totalCents ? "NONE" : order.payoutStatus,
      },
    }),
  ]);
  
  const remaining = order.refundedCents + slice.amountCents;
  if (remaining >= order.totalCents) {
    const { reverseWayPointsForOrder } = await import("./waypoints-service");
    await reverseWayPointsForOrder(order.id, "refund");
    const { reverseCouponUsageForOrder } = await import("./coupons");
    await reverseCouponUsageForOrder(order.id);
  }

  try {
    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: { select: { email: true, name: true, locale: true } },
        restaurant: { select: { name: true } },
      },
    });
    if (full?.customer?.email && slice.amountCents > 0) {
      const locale = parseLocale(full.customer.locale);
      await sendOrderRefunded({
        orderId: full.id,
        stripeRefundId: opts.stripeRefundId,
        to: full.customer.email,
        vars: {
          locale,
          name: full.customer.name,
          restaurant: full.restaurant.name,
          orderCode: full.shortCode,
          amountLabel: formatEUR(slice.amountCents, locale),
        },
      });
    }
    // In-app + browser notice (shared CustomerNotice hook). Email already sent above.
    const paymentStatus = paymentStatusAfterRefund(
      order.refundedCents + slice.amountCents,
      order.totalCents,
    );
    if (paymentStatus === "REFUNDED") {
      const { notifyCustomerOfOrderStatus } = await import("./notify-customer");
      await notifyCustomerOfOrderStatus(order.id, "REFUNDED");
    }
  } catch (mailErr) {
    console.error("stripe.refund.email", mailErr);
  }

  return { ok: true, orderId: order.id, slice };
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const order =
    (await findOrderByCharge(charge.id)) ??
    (await findOrderByPaymentIntent(
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id,
    ));
  if (!order) return { skipped: true, reason: "order_not_found" };

  const refunds = charge.refunds?.data ?? [];
  let last = null;
  for (const refund of refunds) {
    last = await applyRefundToOrder({
      orderId: order.id,
      stripeRefundId: refund.id,
      amountCents: refund.amount,
      status: refund.status ?? "succeeded",
      reason: refund.reason,
    });
  }
  return last ?? { skipped: true, reason: "no_refunds" };
}

export async function handleRefundUpdated(refund: Stripe.Refund) {
  const piId =
    typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
  const order =
    (await findOrderByPaymentIntent(piId)) ?? (await findOrderByCharge(chargeId ?? null));
  if (!order) return { skipped: true, reason: "order_not_found" };
  return applyRefundToOrder({
    orderId: order.id,
    stripeRefundId: refund.id,
    amountCents: refund.amount,
    status: refund.status ?? "pending",
    reason: refund.reason,
  });
}

export async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const order = await findOrderByCharge(chargeId ?? null);
  if (!order) return { skipped: true, reason: "order_not_found" };
  await prisma.order.update({
    where: { id: order.id },
    data: {
      disputeStatus: "NEEDS_RESPONSE",
      paymentStatus: "DISPUTED",
      payoutStatus: order.payoutStatus === "PAID" ? "PAID" : "PENDING",
    },
  });
  return { ok: true, orderId: order.id };
}

export async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const order = await findOrderByCharge(chargeId ?? null);
  if (!order) return { skipped: true, reason: "order_not_found" };
  const lost = dispute.status === "lost" || dispute.status === "warning_closed";
  const won = dispute.status === "won";
  await prisma.order.update({
    where: { id: order.id },
    data: {
      disputeStatus: won ? "WON" : lost ? "LOST" : dispute.status,
      paymentStatus: lost
        ? paymentStatusAfterRefund(order.totalCents, order.totalCents)
        : order.refundedCents > 0
          ? paymentStatusAfterRefund(order.refundedCents, order.totalCents)
          : "PAID",
    },
  });
  if (lost && order.refundedCents < order.totalCents) {
    await applyRefundToOrder({
      orderId: order.id,
      stripeRefundId: `dispute_${dispute.id}`,
      amountCents: order.totalCents - order.refundedCents,
      status: "succeeded",
      reason: "dispute",
    });
  }
  return { ok: true, orderId: order.id };
}

export async function handleConnectedPayout(payout: Stripe.Payout, connectedAccountId?: string) {
  if (!connectedAccountId) return { skipped: true, reason: "no_account" };
  const restaurant = await prisma.restaurant.findUnique({
    where: { stripeAccountId: connectedAccountId },
  });
  if (!restaurant) return { skipped: true, reason: "restaurant_not_found" };

  const created = payout.created ? new Date(payout.created * 1000) : new Date();
  const start = weekStart(created);
  const arrival = payout.arrival_date ? new Date(payout.arrival_date * 1000) : null;
  const failed = payout.status === "failed" || payout.status === "canceled";
  const paid = payout.status === "paid";

  const existing =
    (await prisma.payout.findUnique({
      where: { stripePayoutId: payout.id },
    })) ??
    (await prisma.payout.findUnique({
      where: { restaurantId_weekStart: { restaurantId: restaurant.id, weekStart: start } },
    }));

  const status = paid ? "PAID" : failed ? "FAILED" : "PENDING";
  const row = existing
    ? await prisma.payout.update({
        where: { id: existing.id },
        data: {
          stripePayoutId: payout.id,
          status,
          arrivalDate: arrival,
          failureMessage: failed ? payout.failure_message ?? payout.status : null,
          paidAt: paid ? arrival ?? new Date() : existing.paidAt,
          netPayoutCents: payout.amount ?? existing.netPayoutCents,
        },
      })
    : await prisma.payout.create({
        data: {
          restaurantId: restaurant.id,
          weekStart: start,
          weekEnd: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
          foodTotalCents: 0,
          commissionCents: 0,
          netPayoutCents: payout.amount ?? 0,
          status,
          stripePayoutId: payout.id,
          arrivalDate: arrival,
          failureMessage: failed ? payout.failure_message ?? payout.status : null,
          paidAt: paid ? arrival ?? new Date() : null,
        },
      });

  if (paid) {
    await prisma.order.updateMany({
      where: {
        restaurantId: restaurant.id,
        paymentMethod: { not: "CASH" },
        paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
        payoutStatus: { in: ["PENDING", "UNPAID"] },
      },
      data: { payoutStatus: "PAID", stripePayoutId: payout.id },
    });
  } else if (failed) {
    await prisma.order.updateMany({
      where: { restaurantId: restaurant.id, stripePayoutId: payout.id },
      data: { payoutStatus: "FAILED" },
    });
  }

  return { ok: true, payoutId: row.id, restaurantId: restaurant.id };
}

export async function handleStripeEvent(event: Stripe.Event) {
  const claimed = await claimStripeEvent(event);
  if (!claimed) return { ok: true, duplicate: true };

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case "refund.updated":
      case "refund.created":
        await handleRefundUpdated(event.data.object as Stripe.Refund);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      case "charge.dispute.closed":
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;
      case "payout.paid":
      case "payout.failed":
      case "payout.canceled":
        await handleConnectedPayout(
          event.data.object as Stripe.Payout,
          event.account ?? undefined,
        );
        break;
      case "account.updated":
        await syncRestaurantByStripeAccount(event.data.object as Stripe.Account);
        break;
      default:
        break;
    }
    await markStripeEventProcessed(event.id);
    if (event.type.startsWith("payout.") || event.type === "charge.refunded") {
      try {
        await regeneratePayouts();
      } catch {
        /* ledger refresh is best-effort */
      }
    }
    return { ok: true, type: event.type };
  } catch (e) {
    await releaseStripeEvent(event.id);
    try {
      const detail = e instanceof Error ? `${event.type}: ${e.message}` : `${event.type}: unknown error`;
      await sendCriticalPaymentOrWebhookError({
        dedupeKey: `${event.id}:handler`,
        detail,
      });
    } catch (mailErr) {
      console.error("stripe.critical.email", mailErr);
    }
    throw e;
  }
}
