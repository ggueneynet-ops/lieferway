/** Pure WayPoints math — no Prisma. Credit only on DELIVERED (handed-off). */

export const DEFAULT_POINTS_PER_EURO = 10;
export const WAYPOINTS_COMPLETED_STATUS = "DELIVERED";
export const WAYPOINTS_REVERSAL_STATUSES = ["CANCELLED", "REJECTED"] as const;

export const WAYPOINTS_REWARD_TYPES = ["PERCENT", "FIXED", "FREE_ITEM"] as const;
export type WayPointsRewardType = (typeof WAYPOINTS_REWARD_TYPES)[number];

export const WAYPOINTS_FUNDED_BY = ["RESTAURANT", "LIEFERWAY", "SHARED"] as const;
export type WayPointsFundedBy = (typeof WAYPOINTS_FUNDED_BY)[number];

export const WAYPOINTS_LEDGER_TYPES = [
  "EARN",
  "REDEEM",
  "EARN_REVERSAL",
  "REDEEM_REVERSAL",
  "BONUS",
  "ADJUST",
] as const;
export type WayPointsLedgerType = (typeof WAYPOINTS_LEDGER_TYPES)[number];

export const WAYPOINTS_CAMPAIGN_TYPES = [
  "MULTIPLIER",
  "FIRST_ORDER_BONUS",
  "BONUS_POINTS",
  "BONUS_VOUCHER",
] as const;
export type WayPointsCampaignType = (typeof WAYPOINTS_CAMPAIGN_TYPES)[number];

export function isWayPointsParticipating(r: {
  wayPointsEnabled?: boolean | null;
  wayPointsDisabledByAdmin?: boolean | null;
}) {
  return Boolean(r.wayPointsEnabled) && !r.wayPointsDisabledByAdmin;
}

export function parseRewardType(value: unknown): WayPointsRewardType | null {
  return typeof value === "string" && (WAYPOINTS_REWARD_TYPES as readonly string[]).includes(value)
    ? (value as WayPointsRewardType)
    : null;
}

export function parseFundedBy(value: unknown): WayPointsFundedBy {
  if (typeof value === "string" && (WAYPOINTS_FUNDED_BY as readonly string[]).includes(value)) {
    return value as WayPointsFundedBy;
  }
  return "RESTAURANT";
}

export function parseCampaignType(value: unknown): WayPointsCampaignType | null {
  return typeof value === "string" && (WAYPOINTS_CAMPAIGN_TYPES as readonly string[]).includes(value)
    ? (value as WayPointsCampaignType)
    : null;
}

export function clampBps(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10000, Math.round(value)));
}

export function sharesToBps(restaurantPercent: number, lieferwayPercent: number) {
  const r = Math.max(0, restaurantPercent);
  const l = Math.max(0, lieferwayPercent);
  const sum = r + l;
  if (sum <= 0) return { restaurantShareBps: 10000, lieferwayShareBps: 0 };
  return {
    restaurantShareBps: clampBps((r / sum) * 10000),
    lieferwayShareBps: clampBps((l / sum) * 10000),
  };
}

/** 1 € food = `pointsPerEuro` WayPoints. Uses whole euros of Speisen. */
export function earnPointsFromFood(foodSubtotalCents: number, pointsPerEuro: number) {
  if (foodSubtotalCents <= 0 || pointsPerEuro <= 0) return 0;
  return Math.floor(foodSubtotalCents / 100) * Math.round(pointsPerEuro);
}

export function applyEarnMultiplier(basePoints: number, multiplier: number) {
  if (basePoints <= 0) return 0;
  if (!Number.isFinite(multiplier) || multiplier <= 0) return basePoints;
  return Math.round(basePoints * multiplier);
}

export function splitWayPointsFunding(opts: {
  discountCents: number;
  fundedBy: WayPointsFundedBy;
  restaurantShareBps?: number | null;
  lieferwayShareBps?: number | null;
}): { restaurantShareCents: number; lieferwayShareCents: number; fundedBy: WayPointsFundedBy } {
  const discount = Math.max(0, Math.round(opts.discountCents));
  if (discount === 0) {
    return { restaurantShareCents: 0, lieferwayShareCents: 0, fundedBy: opts.fundedBy };
  }
  if (opts.fundedBy === "LIEFERWAY") {
    return { restaurantShareCents: 0, lieferwayShareCents: discount, fundedBy: "LIEFERWAY" };
  }
  if (opts.fundedBy === "SHARED") {
    const rBps = clampBps(opts.restaurantShareBps ?? 5000);
    const restaurantShareCents = Math.round((discount * rBps) / 10000);
    return {
      restaurantShareCents,
      lieferwayShareCents: discount - restaurantShareCents,
      fundedBy: "SHARED",
    };
  }
  return { restaurantShareCents: discount, lieferwayShareCents: 0, fundedBy: "RESTAURANT" };
}

export function rewardDiscountCents(opts: {
  type: WayPointsRewardType;
  foodSubtotalCents: number;
  percentOff?: number | null;
  discountCents?: number | null;
  freeItemPriceCents?: number | null;
  freeItemInCart?: boolean;
}): number {
  const food = Math.max(0, opts.foodSubtotalCents);
  if (food <= 0) return 0;
  if (opts.type === "PERCENT") {
    const p = opts.percentOff ?? 0;
    if (p <= 0) return 0;
    return Math.min(food, Math.round((food * p) / 100));
  }
  if (opts.type === "FIXED") {
    return Math.min(food, Math.max(0, opts.discountCents ?? 0));
  }
  if (opts.type === "FREE_ITEM") {
    if (!opts.freeItemInCart) return 0;
    return Math.min(food, Math.max(0, opts.freeItemPriceCents ?? 0));
  }
  return 0;
}

/**
 * Stripe application_fee still uses `discountCents` as the **platform-absorbed** slice.
 * Restaurant-funded WayPoints stay out of that number so destination-charge math is unchanged.
 */
export function platformAbsorbedDiscountCents(opts: {
  couponDiscountCents: number;
  wayPointsLieferwayShareCents: number;
}) {
  return Math.max(0, opts.couponDiscountCents) + Math.max(0, opts.wayPointsLieferwayShareCents);
}

export function customerDiscountCents(opts: {
  couponDiscountCents: number;
  wayPointsDiscountCents: number;
  foodSubtotalCents: number;
}) {
  return Math.min(
    Math.max(0, opts.foodSubtotalCents),
    Math.max(0, opts.couponDiscountCents) + Math.max(0, opts.wayPointsDiscountCents),
  );
}

export function checkoutDiscountPlan(opts: {
  foodSubtotalCents: number;
  couponDiscountCents: number;
  wayPointsDiscountCents: number;
  wayPointsLieferwayShareCents: number;
}) {
  const coupon = Math.max(0, opts.couponDiscountCents);
  const wp = Math.max(0, opts.wayPointsDiscountCents);
  return {
    customerDiscountCents: customerDiscountCents({
      couponDiscountCents: coupon,
      wayPointsDiscountCents: wp,
      foodSubtotalCents: opts.foodSubtotalCents,
    }),
    platformAbsorbedDiscountCents: platformAbsorbedDiscountCents({
      couponDiscountCents: coupon,
      wayPointsLieferwayShareCents: opts.wayPointsLieferwayShareCents,
    }),
  };
}

export function previewEarnPoints(opts: {
  foodSubtotalCents: number;
  pointsPerEuro: number;
  multiplier?: number;
}) {
  return applyEarnMultiplier(
    earnPointsFromFood(opts.foodSubtotalCents, opts.pointsPerEuro),
    opts.multiplier ?? 1,
  );
}

export function nextRewardProgress(balance: number, costs: number[]) {
  const sorted = [...new Set(costs.filter((c) => Number.isFinite(c) && c > 0))].sort((a, b) => a - b);
  const next = sorted.find((c) => c > balance) ?? null;
  const target = next ?? sorted[0] ?? null;
  if (target == null) {
    return { nextCost: null as number | null, remaining: 0, current: balance, target: null as number | null };
  }
  return {
    nextCost: next,
    remaining: Math.max(0, target - balance),
    current: balance,
    target,
  };
}

export function ledgerUniqueKey(type: WayPointsLedgerType, orderId: string) {
  return `${type}:${orderId}`;
}

export function campaignLedgerKey(campaignId: string, userId: string, extra = "grant") {
  return `CAMPAIGN:${campaignId}:${userId}:${extra}`;
}

export function isCampaignWindowOpen(
  now: Date,
  validFrom?: Date | null,
  validUntil?: Date | null,
) {
  if (validFrom && now < validFrom) return false;
  if (validUntil && now > validUntil) return false;
  return true;
}

export function fundedByLabel(fundedBy: string | null | undefined) {
  if (fundedBy === "LIEFERWAY") return "Lieferway";
  if (fundedBy === "SHARED") return "Geteilt";
  return "Restaurant";
}

export function formatLedgerTitle(opts: {
  type: WayPointsLedgerType;
  restaurantName?: string | null;
  shortCode?: string | null;
  rewardTitle?: string | null;
}) {
  if (opts.type === "EARN") {
    const place = opts.restaurantName || "Restaurant";
    const code = opts.shortCode ? `Bestellung ${opts.shortCode}` : "Bestellung";
    return `${place} — ${code}`;
  }
  if (opts.type === "REDEEM") {
    return `${opts.rewardTitle || "Prämie"} eingelöst`;
  }
  if (opts.type === "EARN_REVERSAL" || opts.type === "REDEEM_REVERSAL") {
    return opts.shortCode ? `Bestellung ${opts.shortCode} storniert` : "Bestellung storniert";
  }
  return opts.rewardTitle || "WayPoints";
}
