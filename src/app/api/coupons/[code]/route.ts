import { fail, json, options } from "@/lib/http";
import {
  applyCoupon,
  couponBelowMinimum,
  loadRestaurantCoupon,
  publicCouponPayload,
  validateRestaurantCoupon,
} from "@/lib/coupons";
import { parseFulfillment } from "@/lib/fulfillment";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const restaurantId = (url.searchParams.get("restaurantId") ?? "").trim();
  if (!restaurantId) {
    return fail("Restaurant erforderlich für Gutschein-Prüfung.", 400);
  }
  const fulfillment = parseFulfillment(url.searchParams.get("fulfillment") ?? undefined);
  const subtotalRaw = url.searchParams.get("subtotal");
  const subtotal = subtotalRaw == null || subtotalRaw === "" ? Number.NaN : Number(subtotalRaw);
  const foodSubtotalCents = Number.isFinite(subtotal) ? subtotal : 0;

  const validated = await validateRestaurantCoupon({
    restaurantId,
    code,
    foodSubtotalCents,
    fulfillmentType: fulfillment,
  });

  if (!validated.ok) {
    if (validated.code === "min_not_met") {
      const coupon = await loadRestaurantCoupon(restaurantId, code);
      return json(
        {
          error: "min_not_met",
          minSubtotalCents: coupon?.minSubtotalCents ?? null,
          coupon: { code: coupon?.code ?? code.trim().toUpperCase() },
        },
        400,
      );
    }
    return fail(validated.error);
  }

  const coupon = validated.coupon;
  if (Number.isFinite(subtotal) && couponBelowMinimum(subtotal, coupon)) {
    return json(
      {
        error: "min_not_met",
        minSubtotalCents: coupon.minSubtotalCents,
        coupon: { code: coupon.code },
      },
      400,
    );
  }

  return json({
    coupon: {
      ...publicCouponPayload(coupon),
      previewDiscountCents: applyCoupon(foodSubtotalCents, coupon),
    },
  });
}
