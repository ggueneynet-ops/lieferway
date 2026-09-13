import { prisma } from "./prisma";
import {
  aggregateSettlement,
  settleOrder,
  type OrderSettlementInput,
  type SettlementTotals,
  type PayoutSummaryRow,
  emptySettlementTotals,
  weekStart,
  weekEnd,
  parseWeekStartParam,
  toYmdBerlin,
} from "./settlement";

export { weekStart, weekEnd, weekEndExclusive, parseWeekStartParam, toYmdBerlin } from "./settlement";
export type { PayoutSummaryRow } from "./settlement";

const SETTLEMENT_ORDER_SELECT = {
  id: true,
  shortCode: true,
  restaurantId: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  totalCents: true,
  foodSubtotalCents: true,
  deliveryFeeCents: true,
  discountCents: true,
  couponCode: true,
  commissionPercent: true,
  commissionCents: true,
  restaurantPayoutCents: true,
  restaurantNetCents: true,
  refundedCents: true,
  refundedCommissionCents: true,
  refundedRestaurantNetCents: true,
  wayPointsDiscountCents: true,
  wayPointsFundedBy: true,
  wayPointsRestaurantShareCents: true,
  wayPointsLieferwayShareCents: true,
  deliveredAt: true,
  createdAt: true,
} as const;

export type SettlementOrderRow = {
  id: string;
  shortCode: string;
  restaurantId: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  couponCode: string | null;
  commissionPercent: number;
  commissionCents: number;
  restaurantPayoutCents: number;
  restaurantNetCents: number;
  refundedCents: number;
  refundedCommissionCents: number;
  refundedRestaurantNetCents: number;
  wayPointsDiscountCents: number;
  wayPointsFundedBy: string | null;
  wayPointsRestaurantShareCents: number;
  wayPointsLieferwayShareCents: number;
  deliveredAt: Date | null;
  createdAt: Date;
};

function asSettlementInput(order: SettlementOrderRow): OrderSettlementInput {
  return order;
}

function bucketKey(restaurantId: string, start: Date) {
  return `${restaurantId}|${toYmdBerlin(start)}`;
}

async function findPayoutForWeek(restaurantId: string, start: Date) {
  const exact = await prisma.payout.findUnique({
    where: { restaurantId_weekStart: { restaurantId, weekStart: start } },
  });
  if (exact) return exact;
  // Pre-PR rows may use UTC Monday 00:00 (1–2h after Berlin Monday).
  const nearby = await prisma.payout.findFirst({
    where: {
      restaurantId,
      weekStart: {
        gte: new Date(start.getTime() - 3 * 60 * 60 * 1000),
        lte: new Date(start.getTime() + 3 * 60 * 60 * 1000),
      },
    },
  });
  return nearby;
}

/**
 * Weekly restaurant payouts (Monday week, Europe/Berlin).
 * Card/wallet: platform collected — restaurant is owed remaining restaurantNet.
 * Cash: restaurant collected — commission is due to the platform separately.
 * Delivery fee is never part of the restaurant food payout.
 *
 * TODO(tax/invoice): stored net is a settlement amount, not a Steuerrechnung.
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
    select: SETTLEMENT_ORDER_SELECT,
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
    const key = bucketKey(order.restaurantId, start);
    const current = buckets.get(key) ?? {
      restaurantId: order.restaurantId,
      weekStart: start,
      foodTotalCents: 0,
      commissionCents: 0,
      cashCommissionDueCents: 0,
      cardPayoutCents: 0,
    };
    const line = settleOrder(asSettlementInput(order));
    current.foodTotalCents += line.foodCents;
    current.commissionCents += line.commissionCents;
    current.cashCommissionDueCents += line.cashCommissionDueCents;
    current.cardPayoutCents += line.cardPayoutCents;
    buckets.set(key, current);
  }

  const results = [];
  for (const bucket of buckets.values()) {
    const netPayoutCents = bucket.cardPayoutCents - bucket.cashCommissionDueCents;
    const existing = await findPayoutForWeek(bucket.restaurantId, bucket.weekStart);
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

function iso(d: Date) {
  return d.toISOString();
}

export async function listPayoutSummaries(opts?: {
  restaurantId?: string;
  weekStart?: Date | null;
  includeComputedWeeks?: boolean;
}): Promise<PayoutSummaryRow[]> {
  const payoutWhere = {
    ...(opts?.restaurantId ? { restaurantId: opts.restaurantId } : {}),
    ...(opts?.weekStart ? { weekStart: opts.weekStart } : {}),
  };

  const orderWhere = {
    ...(opts?.restaurantId ? { restaurantId: opts.restaurantId } : {}),
    ...(opts?.weekStart
      ? {
          OR: [
            { deliveredAt: { gte: opts.weekStart, lte: weekEnd(opts.weekStart) } },
            { deliveredAt: null, createdAt: { gte: opts.weekStart, lte: weekEnd(opts.weekStart) } },
          ],
        }
      : {}),
  };

  const [payouts, orders, restaurants] = await Promise.all([
    prisma.payout.findMany({
      where: payoutWhere,
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ weekStart: "desc" }, { restaurant: { name: "asc" } }],
    }),
    prisma.order.findMany({
      where: orderWhere,
      select: SETTLEMENT_ORDER_SELECT,
    }),
    prisma.restaurant.findMany({
      where: opts?.restaurantId ? { id: opts.restaurantId } : {},
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
  for (const p of payouts) restaurantById.set(p.restaurantId, p.restaurant);

  const buckets = new Map<string, { restaurantId: string; weekStart: Date; totals: SettlementTotals }>();
  for (const order of orders) {
    const start = weekStart(order.deliveredAt ?? order.createdAt);
    const key = bucketKey(order.restaurantId, start);
    const current = buckets.get(key) ?? {
      restaurantId: order.restaurantId,
      weekStart: start,
      totals: emptySettlementTotals(),
    };
    current.totals = aggregateSettlement([
      { ...current.totals, eligible: true, cancelled: false },
      settleOrder(asSettlementInput(order)),
    ]);
    buckets.set(key, current);
  }

  const payoutByKey = new Map(
    payouts.map((p) => [bucketKey(p.restaurantId, p.weekStart), p]),
  );

  const keys = new Set<string>([
    ...payoutByKey.keys(),
    ...(opts?.includeComputedWeeks ? buckets.keys() : payoutByKey.keys()),
  ]);
  if (opts?.includeComputedWeeks) {
    for (const key of buckets.keys()) keys.add(key);
  }

  const rows: PayoutSummaryRow[] = [];
  for (const key of keys) {
    const [restaurantId, weekYmd] = key.split("|");
    const start = parseWeekStartParam(weekYmd);
    if (!start) continue;
    const payout = payoutByKey.get(key);
    const bucket = buckets.get(key);
    const restaurant = restaurantById.get(restaurantId) ?? payout?.restaurant;
    if (!restaurant) continue;
    const live = bucket?.totals ?? emptySettlementTotals();
    const useStored = payout?.status === "PAID";
    rows.push({
      id: payout?.id ?? null,
      restaurantId,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      weekStart: iso(payout?.weekStart ?? start),
      weekEnd: iso(payout?.weekEnd ?? weekEnd(start)),
      status: payout?.status ?? "PENDING",
      paidAt: payout?.paidAt ? iso(payout.paidAt) : null,
      storedNetPayoutCents: payout?.netPayoutCents ?? null,
      totals: useStored
        ? {
            ...live,
            // Keep live coupon/WP/refund breakdown; lock payable to the paid row.
            netPayableCents: payout.netPayoutCents,
            commissionCents: payout.commissionCents,
            foodCents: payout.foodTotalCents,
            cashCommissionDueCents: payout.cashCommissionDueCents,
            cardPayoutCents: payout.cardPayoutCents,
          }
        : live,
    });
  }

  rows.sort((a, b) => {
    if (a.weekStart !== b.weekStart) return a.weekStart < b.weekStart ? 1 : -1;
    return a.restaurantName.localeCompare(b.restaurantName, "de");
  });
  return rows;
}

export async function loadSettlementOrders(opts: {
  restaurantId?: string;
  from?: Date | null;
  to?: Date | null;
}): Promise<SettlementOrderRow[]> {
  const createdOrDelivered =
    opts.from || opts.to
      ? {
          OR: [
            {
              deliveredAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lt: opts.to } : {}),
              },
            },
            {
              deliveredAt: null,
              createdAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lt: opts.to } : {}),
              },
            },
          ],
        }
      : {};

  return prisma.order.findMany({
    where: {
      ...(opts.restaurantId ? { restaurantId: opts.restaurantId } : {}),
      ...createdOrDelivered,
    },
    select: SETTLEMENT_ORDER_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export function summarizeOrders(orders: SettlementOrderRow[]) {
  return aggregateSettlement(orders.map((o) => settleOrder(asSettlementInput(o))));
}

export function bucketOrdersByWeek(orders: SettlementOrderRow[]) {
  const map = new Map<string, { weekStart: Date; weekEnd: Date; orders: SettlementOrderRow[]; totals: SettlementTotals }>();
  for (const order of orders) {
    const start = weekStart(order.deliveredAt ?? order.createdAt);
    const key = start.toISOString();
    const current = map.get(key) ?? {
      weekStart: start,
      weekEnd: weekEnd(start),
      orders: [],
      totals: emptySettlementTotals(),
    };
    current.orders.push(order);
    map.set(key, current);
  }
  for (const bucket of map.values()) {
    bucket.totals = summarizeOrders(bucket.orders);
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}
