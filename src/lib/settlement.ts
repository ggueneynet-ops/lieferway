/**
 * Restaurant Abrechnung / payout settlement (books, not tax law).
 *
 * Formula (matches checkout `computeOrderTotals` + stored order nets):
 *   commissionBase = foodSubtotal − restaurant Gutschein
 *   commission     = round(commissionBase × percent / 100)   // default 8 %
 *   restaurant food payout = commissionBase − commission
 *   Gutschein is 100 % restaurant-funded; commission is on post-coupon food.
 *   WayPoints: restaurant share reduces restaurant; Lieferway share is platform-funded
 *              (does NOT reduce the commission base).
 *   Delivery fee is never restaurant food payout.
 *   Card: restaurantNet already includes Stripe fee + restaurant-funded WayPoints
 *         (via application_fee). Cash: restaurant collected cash; commission is due
 *         to the platform. netPayable = cardPayout − cashCommissionDue.
 *   Refunds: use remaining* fields. Full refund zeros remaining food/commission/net.
 *   Cancellations / REJECTED / PENDING_PAYMENT: not payable.
 *
 * TODO(tax/invoice): USt on commission, reverse charge, Kleinunternehmer, DATEV,
 * ZUGFeRD/XRechnung, and whether Speisen amounts are MwSt-inclusive for the
 * restaurant are NOT specified here. This module is a settlement statement,
 * not a tax invoice.
 */

import { commissionCents } from "./money";

export const SETTLEMENT_TZ = "Europe/Berlin";

/** Delivered + collected (not pending/failed). Matches `regeneratePayouts`. */
export const PAYOUT_ELIGIBLE_STATUSES = ["DELIVERED"] as const;
export const PAYOUT_EXCLUDED_PAYMENT = ["PENDING", "FAILED"] as const;
export const SETTLEMENT_CANCELLED_STATUSES = ["CANCELLED", "REJECTED"] as const;

export type OrderSettlementInput = {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  couponCode?: string | null;
  commissionPercent: number;
  commissionCents: number;
  restaurantPayoutCents: number;
  restaurantNetCents: number;
  refundedCents: number;
  refundedCommissionCents: number;
  refundedRestaurantNetCents: number;
  wayPointsDiscountCents: number;
  wayPointsFundedBy?: string | null;
  wayPointsRestaurantShareCents: number;
  wayPointsLieferwayShareCents: number;
};

export type OrderSettlementLine = {
  eligible: boolean;
  cancelled: boolean;
  orderCount: number;
  cancelledCount: number;
  refundedOrderCount: number;
  /** Guest paid (remaining). */
  grossGuestCents: number;
  /** Speisen before discounts (0 if fully refunded). */
  foodCents: number;
  /** Restaurant-funded Gutschein (inferred: discount − WayPoints). */
  couponDiscountCents: number;
  wayPointsRestaurantCents: number;
  wayPointsLieferwayCents: number;
  commissionCents: number;
  refundedCents: number;
  cashCommissionDueCents: number;
  cardPayoutCents: number;
  netPayableCents: number;
};

export type SettlementTotals = Omit<OrderSettlementLine, "eligible" | "cancelled">;

export type PayoutSummaryRow = {
  id: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  paidAt: string | null;
  storedNetPayoutCents: number | null;
  totals: SettlementTotals;
};


export function emptySettlementTotals(): SettlementTotals {
  return {
    orderCount: 0,
    cancelledCount: 0,
    refundedOrderCount: 0,
    grossGuestCents: 0,
    foodCents: 0,
    couponDiscountCents: 0,
    wayPointsRestaurantCents: 0,
    wayPointsLieferwayCents: 0,
    commissionCents: 0,
    refundedCents: 0,
    cashCommissionDueCents: 0,
    cardPayoutCents: 0,
    netPayableCents: 0,
  };
}

/** Guest-facing discount is coupon + WayPoints; coupon is the restaurant Gutschein slice. */
export function couponDiscountFromOrder(order: Pick<OrderSettlementInput, "discountCents" | "wayPointsDiscountCents">) {
  return Math.max(0, (order.discountCents ?? 0) - (order.wayPointsDiscountCents ?? 0));
}

export function commissionBaseFromOrder(order: Pick<OrderSettlementInput, "foodSubtotalCents" | "discountCents" | "wayPointsDiscountCents">) {
  return Math.max(0, order.foodSubtotalCents - couponDiscountFromOrder(order));
}

export function isPayoutEligible(order: Pick<OrderSettlementInput, "status" | "paymentStatus">) {
  return (
    (PAYOUT_ELIGIBLE_STATUSES as readonly string[]).includes(order.status) &&
    !(PAYOUT_EXCLUDED_PAYMENT as readonly string[]).includes(order.paymentStatus)
  );
}

export function isCancelledLike(order: Pick<OrderSettlementInput, "status">) {
  return (SETTLEMENT_CANCELLED_STATUSES as readonly string[]).includes(order.status);
}

/**
 * Expected restaurant food payout from first principles (no Stripe fee, no WP).
 * Used in tests to lock "commission on post-coupon food".
 */
export function expectedFoodPayoutCents(foodSubtotalCents: number, couponDiscountCents: number, percent: number) {
  const base = Math.max(0, foodSubtotalCents - Math.max(0, couponDiscountCents));
  const commission = commissionCents(base, percent);
  return { commissionBaseCents: base, commissionCents: commission, restaurantPayoutCents: base - commission };
}

export function settleOrder(order: OrderSettlementInput): OrderSettlementLine {
  const cancelled = isCancelledLike(order);
  const eligible = isPayoutEligible(order);
  const couponDiscountCents = couponDiscountFromOrder(order);
  const fullyRefunded = order.totalCents > 0 && order.refundedCents >= order.totalCents;
  const remainingGrossCents = Math.max(0, order.totalCents - (order.refundedCents ?? 0));
  const remainingCommissionCents = Math.max(0, order.commissionCents - (order.refundedCommissionCents ?? 0));
  const remainingRestaurantNetCents = Math.max(
    0,
    (order.restaurantNetCents || order.restaurantPayoutCents) - (order.refundedRestaurantNetCents ?? 0),
  );
  const remainingFoodCents = fullyRefunded ? 0 : order.foodSubtotalCents;
  const remainingCouponCents = fullyRefunded ? 0 : couponDiscountCents;
  const remainingWpRestaurant = fullyRefunded ? 0 : Math.max(0, order.wayPointsRestaurantShareCents ?? 0);
  const remainingWpLieferway = fullyRefunded ? 0 : Math.max(0, order.wayPointsLieferwayShareCents ?? 0);

  let cashCommissionDueCents = 0;
  let cardPayoutCents = 0;
  if (eligible) {
    if (order.paymentMethod === "CASH") {
      cashCommissionDueCents = remainingCommissionCents;
    } else {
      cardPayoutCents = remainingRestaurantNetCents;
    }
  }

  const netPayableCents = cardPayoutCents - cashCommissionDueCents;

  if (!eligible) {
    return {
      eligible: false,
      cancelled,
      orderCount: 0,
      cancelledCount: cancelled ? 1 : 0,
      refundedOrderCount: 0,
      grossGuestCents: 0,
      foodCents: 0,
      couponDiscountCents: 0,
      wayPointsRestaurantCents: 0,
      wayPointsLieferwayCents: 0,
      commissionCents: 0,
      refundedCents: 0,
      cashCommissionDueCents: 0,
      cardPayoutCents: 0,
      netPayableCents: 0,
    };
  }

  return {
    eligible: true,
    cancelled: false,
    orderCount: 1,
    cancelledCount: 0,
    refundedOrderCount: (order.refundedCents ?? 0) > 0 ? 1 : 0,
    grossGuestCents: remainingGrossCents,
    foodCents: remainingFoodCents,
    couponDiscountCents: remainingCouponCents,
    wayPointsRestaurantCents: remainingWpRestaurant,
    wayPointsLieferwayCents: remainingWpLieferway,
    commissionCents: remainingCommissionCents,
    refundedCents: order.refundedCents ?? 0,
    cashCommissionDueCents,
    cardPayoutCents,
    netPayableCents,
  };
}

export function aggregateSettlement(lines: OrderSettlementLine[]): SettlementTotals {
  const acc = emptySettlementTotals();
  for (const line of lines) {
    acc.orderCount += line.orderCount;
    acc.cancelledCount += line.cancelledCount;
    acc.refundedOrderCount += line.refundedOrderCount;
    acc.grossGuestCents += line.grossGuestCents;
    acc.foodCents += line.foodCents;
    acc.couponDiscountCents += line.couponDiscountCents;
    acc.wayPointsRestaurantCents += line.wayPointsRestaurantCents;
    acc.wayPointsLieferwayCents += line.wayPointsLieferwayCents;
    acc.commissionCents += line.commissionCents;
    acc.refundedCents += line.refundedCents;
    acc.cashCommissionDueCents += line.cashCommissionDueCents;
    acc.cardPayoutCents += line.cardPayoutCents;
    acc.netPayableCents += line.netPayableCents;
  }
  return acc;
}

export function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return `${lines.join("\n")}\n`;
}

export const WEEKLY_CSV_HEADERS = [
  "restaurant",
  "restaurant_id",
  "week_start",
  "week_end",
  "orders",
  "cancelled",
  "refunded_orders",
  "gross_guest_cents",
  "food_cents",
  "coupon_cents",
  "waypoints_restaurant_cents",
  "waypoints_lieferway_cents",
  "commission_cents",
  "refunded_cents",
  "cash_commission_due_cents",
  "card_payout_cents",
  "net_payable_cents",
  "status",
] as const;

export const ORDER_CSV_HEADERS = [
  "short_code",
  "week_start",
  "status",
  "payment_method",
  "payment_status",
  "delivered_at",
  "gross_guest_cents",
  "food_cents",
  "coupon_cents",
  "waypoints_restaurant_cents",
  "waypoints_lieferway_cents",
  "commission_cents",
  "refunded_cents",
  "net_payable_cents",
] as const;

export type WeeklyCsvRow = {
  restaurant: string;
  restaurantId: string;
  weekStart: string;
  weekEnd: string;
  totals: SettlementTotals;
  status: string;
};

export function weeklySummariesToCsv(rows: WeeklyCsvRow[]) {
  return toCsv(
    [...WEEKLY_CSV_HEADERS],
    rows.map((row) => [
      row.restaurant,
      row.restaurantId,
      row.weekStart,
      row.weekEnd,
      row.totals.orderCount,
      row.totals.cancelledCount,
      row.totals.refundedOrderCount,
      row.totals.grossGuestCents,
      row.totals.foodCents,
      row.totals.couponDiscountCents,
      row.totals.wayPointsRestaurantCents,
      row.totals.wayPointsLieferwayCents,
      row.totals.commissionCents,
      row.totals.refundedCents,
      row.totals.cashCommissionDueCents,
      row.totals.cardPayoutCents,
      row.totals.netPayableCents,
      row.status,
    ]),
  );
}

function berlinYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SETTLEMENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function asBerlinWallClock(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SETTLEMENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second")),
    ),
  );
}

function startOfBerlinDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const wall = asBerlinWallClock(new Date(utcGuess));
  const intended = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(utcGuess + (intended - wall.getTime()));
}

function addDaysYmd(ymd: string, days: number): string {
  const start = startOfBerlinDay(ymd);
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
  return berlinYmd(next);
}

/** Monday 00:00 Europe/Berlin of the week containing `d`. */
export function weekStart(d: Date) {
  const ymd = berlinYmd(d);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SETTLEMENT_TZ,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  return startOfBerlinDay(addDaysYmd(ymd, -offset));
}

/** Inclusive end of the Berlin week (Sunday 23:59:59.999 Berlin). */
export function weekEnd(start: Date) {
  const ymd = berlinYmd(start);
  return new Date(startOfBerlinDay(addDaysYmd(ymd, 7)).getTime() - 1);
}

export function weekEndExclusive(start: Date) {
  const ymd = berlinYmd(start);
  return startOfBerlinDay(addDaysYmd(ymd, 7));
}

export function parseWeekStartParam(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return weekStart(startOfBerlinDay(value));
}

export function toYmdBerlin(d: Date) {
  return berlinYmd(d);
}

