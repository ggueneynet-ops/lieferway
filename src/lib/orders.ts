import { prisma } from "./prisma";
import { commissionCents } from "./money";
import type { PaymentMethod } from "./constants";
import {
  applyCoupon as applyRestaurantCoupon,
  couponBelowMinimum as couponMinCheck,
  type CouponLike,
} from "./coupons";

export type CouponDiscount = CouponLike;

export function couponBelowMinimum(foodSubtotalCents: number, coupon: CouponDiscount | null) {
  return couponMinCheck(foodSubtotalCents, coupon);
}

export function applyCoupon(foodSubtotalCents: number, coupon: CouponDiscount | null) {
  return applyRestaurantCoupon(foodSubtotalCents, coupon);
}

export function computeOrderTotals(opts: {
  foodSubtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  commissionPercent: number;
  /**
   * Restaurant-funded Gutschein amount (cents).
   * Commission is calculated on food AFTER this coupon (30€−5€ → 25€ → 8% = 2€).
   * WayPoints discounts do not reduce the commission base here.
   */
  restaurantCouponCents?: number;
}) {
  const couponSlice = Math.max(
    0,
    Math.min(opts.restaurantCouponCents ?? 0, Math.max(0, opts.foodSubtotalCents)),
  );
  const commissionBaseCents = opts.foodSubtotalCents - couponSlice;
  const commission = commissionCents(commissionBaseCents, opts.commissionPercent);
  const restaurantPayoutCents = commissionBaseCents - commission;
  const totalCents = opts.foodSubtotalCents - opts.discountCents + opts.deliveryFeeCents;
  return {
    commissionCents: commission,
    restaurantPayoutCents,
    totalCents: Math.max(0, totalCents),
    commissionBaseCents,
  };
}

export function paymentStatusFor(method: PaymentMethod, paid: boolean) {
  if (method === "CASH") return "CASH_ON_DELIVERY";
  return paid ? "PAID" : "PENDING";
}

export function isKitchenVisibleStatus(status: string) {
  return status !== "PENDING_PAYMENT";
}

export function isOnlineMethod(method: PaymentMethod | string) {
  return method !== "CASH";
}

export function initialOnlineOrderStatus() {
  return "PENDING_PAYMENT" as const;
}

export function nextShortCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `LW-${n}`;
}

export async function uniqueShortCode() {
  for (let i = 0; i < 8; i++) {
    const code = nextShortCode();
    const exists = await prisma.order.findUnique({ where: { shortCode: code } });
    if (!exists) return code;
  }
  return `LW-${Date.now().toString().slice(-6)}`;
}
