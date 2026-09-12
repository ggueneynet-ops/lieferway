import { prisma } from "./prisma";

export function weekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function weekEnd(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);
  return end;
}

/**
 * Weekly restaurant payouts (Monday week).
 * Card/wallet: platform collected — restaurant is owed food − commission.
 * Cash: restaurant collected — commission is due to the platform separately.
 * Delivery fee is never part of the restaurant food payout.
 */
export async function regeneratePayouts(forWeekStart?: Date) {
  const orders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      paymentStatus: { notIn: ["PENDING", "FAILED"] },
      ...(forWeekStart
        ? {
            deliveredAt: {
              gte: forWeekStart,
              lte: weekEnd(forWeekStart),
            },
          }
        : {}),
    },
  });

  const buckets = new Map<
    string,
    {
      restaurantId: string;
      weekStart: Date;
      foodTotalCents: number;
      commissionCents: number;
      cashCommissionDueCents: number;
      cardPayoutCents: number;
    }
  >();

  for (const order of orders) {
    const start = weekStart(order.deliveredAt ?? order.createdAt);
    const key = `${order.restaurantId}|${start.toISOString()}`;
    const current = buckets.get(key) ?? {
      restaurantId: order.restaurantId,
      weekStart: start,
      foodTotalCents: 0,
      commissionCents: 0,
      cashCommissionDueCents: 0,
      cardPayoutCents: 0,
    };
    const remainingCommission = Math.max(0, order.commissionCents - (order.refundedCommissionCents ?? 0));
    const remainingFood = order.refundedCents >= order.totalCents ? 0 : order.foodSubtotalCents;
    const remainingNet = Math.max(
      0,
      (order.restaurantNetCents || order.restaurantPayoutCents) - (order.refundedRestaurantNetCents ?? 0),
    );
    current.foodTotalCents += remainingFood;
    current.commissionCents += remainingCommission;
    if (order.paymentMethod === "CASH") {
      current.cashCommissionDueCents += remainingCommission;
    } else {
      current.cardPayoutCents += remainingNet;
    }
    buckets.set(key, current);
  }

  const results = [];
  for (const bucket of buckets.values()) {
    const netPayoutCents = bucket.cardPayoutCents - bucket.cashCommissionDueCents;
    const existing = await prisma.payout.findUnique({
      where: {
        restaurantId_weekStart: {
          restaurantId: bucket.restaurantId,
          weekStart: bucket.weekStart,
        },
      },
    });
    const data = {
      weekEnd: weekEnd(bucket.weekStart),
      foodTotalCents: bucket.foodTotalCents,
      commissionCents: bucket.commissionCents,
      netPayoutCents,
      cashCommissionDueCents: bucket.cashCommissionDueCents,
      cardPayoutCents: bucket.cardPayoutCents,
    };
    if (existing) {
      if (existing.status === "PAID") {
        results.push(existing);
        continue;
      }
      results.push(
        await prisma.payout.update({
          where: { id: existing.id },
          data,
        }),
      );
    } else {
      results.push(
        await prisma.payout.create({
          data: {
            restaurantId: bucket.restaurantId,
            weekStart: bucket.weekStart,
            ...data,
          },
        }),
      );
    }
  }
  return results;
}
