import { prisma } from "./prisma";
import { commissionCents } from "./money";
import type { PaymentMethod } from "./constants";

export type CouponDiscount = {
  discountPercent: number | null;
  discountCents: number | null;
  isActive: boolean;
  minSubtotalCents?: number | null;
};

export function couponBelowMinimum(foodSubtotalCents: number, coupon: CouponDiscount | null) {
  if (!coupon?.isActive) return false;
  const min = coupon.minSubtotalCents ?? 0;
  return min > 0 && foodSubtotalCents < min;
}

export function applyCoupon(foodSubtotalCents: number, coupon: CouponDiscount | null) {
  if (!coupon || !coupon.isActive) return 0;
  if (couponBelowMinimum(foodSubtotalCents, coupon)) return 0;
  if (coupon.discountPercent) {
    return Math.round((foodSubtotalCents * coupon.discountPercent) / 100);
  }
  if (coupon.discountCents) {
    return Math.min(coupon.discountCents, foodSubtotalCents);
  }
  return 0;
}

export function computeOrderTotals(opts: {
  foodSubtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  commissionPercent: number;
}) {
  const commission = commissionCents(opts.foodSubtotalCents, opts.commissionPercent);
  const restaurantPayoutCents = opts.foodSubtotalCents - commission;
  const totalCents = opts.foodSubtotalCents - opts.discountCents + opts.deliveryFeeCents;
  return {
    commissionCents: commission,
    restaurantPayoutCents,
    totalCents: Math.max(0, totalCents),
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
