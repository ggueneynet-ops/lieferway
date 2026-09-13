import { prisma } from "./prisma";
import { allowCouponWayPointsStack } from "./constants";

export type CouponType = "PERCENT" | "FIXED";
export type CouponScope = "DELIVERY" | "PICKUP" | "BOTH";
export type CouponFunding = "RESTAURANT";

export type CouponLike = {
  id?: string;
  code: string;
  isActive: boolean;
  restaurantId?: string | null;
  type?: string | null;
  discountPercent: number | null;
  discountCents: number | null;
  maxDiscountCents?: number | null;
  minSubtotalCents?: number | null;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  maxTotalUses?: number | null;
  usesPerCustomer?: number | null;
  usageCount?: number | null;
  scope?: string | null;
  funding?: string | null;
};

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export function parseCouponType(value?: string | null): CouponType | null {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "PERCENT" || v === "FIXED") return v;
  return null;
}

export function parseCouponScope(value?: string | null): CouponScope {
  const v = (value ?? "BOTH").trim().toUpperCase();
  if (v === "DELIVERY" || v === "PICKUP" || v === "BOTH") return v;
  return "BOTH";
}

export function couponBelowMinimum(foodSubtotalCents: number, coupon: CouponLike | null) {
  if (!coupon?.isActive) return false;
  const min = coupon.minSubtotalCents ?? 0;
  return min > 0 && foodSubtotalCents < min;
}

export function couponDateActive(coupon: CouponLike, now = new Date()) {
  const from = coupon.validFrom ? new Date(coupon.validFrom) : null;
  const to = coupon.validTo ? new Date(coupon.validTo) : null;
  if (from && !Number.isNaN(from.getTime()) && now < from) return false;
  if (to && !Number.isNaN(to.getTime()) && now > to) return false;
  return true;
}

export function couponScopeAllows(coupon: CouponLike, fulfillmentType: string) {
  const scope = parseCouponScope(coupon.scope);
  if (scope === "BOTH") return true;
  const ft = fulfillmentType === "PICKUP" ? "PICKUP" : "DELIVERY";
  return scope === ft;
}

/** Discount on food only; never negative; % capped by maxDiscountCents. */
export function applyCoupon(foodSubtotalCents: number, coupon: CouponLike | null) {
  if (!coupon || !coupon.isActive) return 0;
  if (couponBelowMinimum(foodSubtotalCents, coupon)) return 0;
  const food = Math.max(0, foodSubtotalCents);
  let discount = 0;
  const type = parseCouponType(coupon.type)
    ?? (coupon.discountCents && !coupon.discountPercent ? "FIXED" : "PERCENT");
  if (type === "PERCENT" && coupon.discountPercent) {
    discount = Math.round((food * coupon.discountPercent) / 100);
    if (coupon.maxDiscountCents != null && coupon.maxDiscountCents >= 0) {
      discount = Math.min(discount, coupon.maxDiscountCents);
    }
  } else if (coupon.discountCents) {
    discount = coupon.discountCents;
  }
  return Math.min(Math.max(0, discount), food);
}

export type CouponValidateOk = { ok: true; coupon: NonNullable<Awaited<ReturnType<typeof loadRestaurantCoupon>>> };
export type CouponValidateErr = { ok: false; error: string; code?: string };

export async function loadRestaurantCoupon(restaurantId: string, code: string) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  return prisma.coupon.findFirst({
    where: {
      restaurantId,
      code: normalized,
    },
  });
}

export async function validateRestaurantCoupon(opts: {
  restaurantId: string;
  code: string;
  foodSubtotalCents: number;
  fulfillmentType: string;
  customerId?: string | null;
}): Promise<CouponValidateOk | CouponValidateErr> {
  const coupon = await loadRestaurantCoupon(opts.restaurantId, opts.code);
  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "Gutschein ungültig.", code: "invalid" };
  }
  if (!coupon.restaurantId || coupon.restaurantId !== opts.restaurantId) {
    return { ok: false, error: "Gutschein gilt nicht für dieses Restaurant.", code: "wrong_restaurant" };
  }
  if (!couponDateActive(coupon)) {
    return { ok: false, error: "Gutschein abgelaufen oder noch nicht gültig.", code: "expired" };
  }
  if (!couponScopeAllows(coupon, opts.fulfillmentType)) {
    return {
      ok: false,
      error:
        coupon.scope === "PICKUP"
          ? "Gutschein gilt nur für Abholung."
          : "Gutschein gilt nur für Lieferung.",
      code: "scope",
    };
  }
  if (couponBelowMinimum(opts.foodSubtotalCents, coupon)) {
    return { ok: false, error: "Mindestbestellwert für diesen Gutschein nicht erreicht.", code: "min_not_met" };
  }
  if (coupon.maxTotalUses != null && coupon.usageCount >= coupon.maxTotalUses) {
    return { ok: false, error: "Gutschein ist ausgeschöpft.", code: "max_uses" };
  }
  if (opts.customerId && coupon.usesPerCustomer != null && coupon.usesPerCustomer > 0) {
    const used = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        customerId: opts.customerId,
        status: "APPLIED",
      },
    });
    if (used >= coupon.usesPerCustomer) {
      return { ok: false, error: "Du hast diesen Gutschein bereits genutzt.", code: "per_customer" };
    }
  }
  // When subtotal is unknown (preview without amount), skip discount>0 check.
  if (opts.foodSubtotalCents > 0) {
    const discount = applyCoupon(opts.foodSubtotalCents, coupon);
    if (discount <= 0) {
      return { ok: false, error: "Gutschein ungültig.", code: "invalid" };
    }
  }
  return { ok: true, coupon };
}

/** Record usage idempotently (unique on orderId). */
export async function recordCouponUsage(opts: {
  couponId: string;
  orderId: string;
  customerId: string;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.couponUsage.create({
        data: {
          couponId: opts.couponId,
          orderId: opts.orderId,
          customerId: opts.customerId,
          status: "APPLIED",
        },
      });
      await tx.coupon.update({
        where: { id: opts.couponId },
        data: { usageCount: { increment: 1 } },
      });
    });
    return { created: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Unique orderId → already recorded
    if (/Unique constraint|CouponUsage_orderId/i.test(msg)) {
      return { created: false as const, reason: "already" as const };
    }
    throw e;
  }
}

/** Restore usage on cancel/refund (idempotent via status REVERSED). */
export async function reverseCouponUsageForOrder(orderId: string) {
  const usage = await prisma.couponUsage.findUnique({ where: { orderId } });
  if (!usage || usage.status !== "APPLIED") {
    return { skipped: true as const, reason: usage ? "already_reversed" : "missing" };
  }
  await prisma.$transaction(async (tx) => {
    const updated = await tx.couponUsage.updateMany({
      where: { id: usage.id, status: "APPLIED" },
      data: { status: "REVERSED" },
    });
    if (updated.count === 0) return;
    await tx.coupon.update({
      where: { id: usage.couponId },
      data: { usageCount: { decrement: 1 } },
    });
  });
  return { skipped: false as const };
}

export function couponXorBlocks(opts: {
  hasCoupon: boolean;
  hasWayPoints: boolean;
}) {
  if (!opts.hasCoupon || !opts.hasWayPoints) return false;
  return !allowCouponWayPointsStack();
}

export function publicCouponPayload(coupon: {
  id: string;
  code: string;
  description: string;
  type: string;
  discountPercent: number | null;
  discountCents: number | null;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
  isActive: boolean;
  scope: string;
  funding: string;
  validFrom: Date | null;
  validTo: Date | null;
}) {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    discountPercent: coupon.discountPercent,
    discountCents: coupon.discountCents,
    maxDiscountCents: coupon.maxDiscountCents,
    minSubtotalCents: coupon.minSubtotalCents,
    isActive: coupon.isActive,
    scope: coupon.scope,
    funding: coupon.funding,
    validFrom: coupon.validFrom,
    validTo: coupon.validTo,
  };
}
