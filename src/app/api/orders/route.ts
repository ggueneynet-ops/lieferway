import { z } from "zod";
import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { applyCoupon, computeOrderTotals, paymentStatusFor, uniqueShortCode } from "@/lib/orders";
import { checkoutDiscountPlan, isWayPointsParticipating, previewEarnPoints } from "@/lib/waypoints";
import {
  bestEarnMultiplier,
  getWayPointsSettings,
  previewCheckoutReward,
  redeemRewardForOrder,
} from "@/lib/waypoints-service";
import {
  couponXorBlocks,
  recordCouponUsage,
  reverseCouponUsageForOrder,
  validateRestaurantCoupon,
} from "@/lib/coupons";
import { allowCouponWayPointsStack } from "@/lib/constants";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";
import { PAYMENT_METHODS } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { parseFulfillment } from "@/lib/fulfillment";
import { createDestinationPaymentIntent } from "@/lib/payments";
import { alertCritical, isCriticalDatabaseError, safeErrorMessage } from "@/lib/alerts";
import { computeApplicationFeeCents } from "@/lib/stripe-fees";
import { canAcceptOnlinePayments } from "@/lib/stripe-connect";
import { getStripe, isStripeConfigured, stripePublishableKey } from "@/lib/stripe";
import { validateScheduledFor } from "@/lib/preorder";
import {
  assertCartLinesAgainstMenu,
  assertDeliveryAddress,
  assertDeliveryCoverage,
  assertDeliveryFeeMatches,
  assertMinOrder,
  normalizeIdempotencyKey,
  restaurantAcceptingOrders,
} from "@/lib/checkout-guards";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);

  const where =
    session.role === "ADMIN"
      ? {}
      : session.role === "CUSTOMER"
        ? { customerId: session.id }
        : session.role === "COURIER"
          ? { OR: [{ courierId: session.id }, { status: "READY", courierId: null }] }
          : session.role === "RESTAURANT"
            ? { restaurant: { ownerId: session.id }, status: { not: "PENDING_PAYMENT" } }
            : { customerId: session.id };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      restaurant: { select: { name: true, slug: true, imageUrl: true, address: true } },
      customer: { select: { name: true, email: true, phone: true } },
      courier: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ orders });
}

const createSchema = z.object({
  restaurantId: z.string(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1).max(20),
        /** Cart unit price — reject when menu price drifted (stale cart). */
        expectedPriceCents: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentIntentId: z.string().optional(),
  customerName: z.string().trim().min(2).max(80),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  wayPointsRewardId: z.string().optional(),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]).optional(),
  /** ISO or Berlin wall `YYYY-MM-DDTHH:mm` — only when restaurant preorder enabled */
  scheduledFor: z.string().optional().nullable(),
  /** Client UUID — same key must not create two orders (double-click / refresh). */
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  /** Cart delivery fee snapshot for DELIVERY; server is source of truth. */
  expectedDeliveryFeeCents: z.number().int().nonnegative().optional(),
});

function failCode(message: string, code: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, code, ...extra }, status);
}

async function replayOrderResponse(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      restaurant: { select: { name: true, slug: true, imageUrl: true, address: true } },
    },
  });
  if (!order) return fail("Bestellung nicht gefunden.", 404);
  const cash = order.paymentMethod === "CASH";
  let clientSecret: string | null = null;
  if (!cash && order.stripePaymentIntentId && order.status === "PENDING_PAYMENT") {
    try {
      const pi = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId);
      if (
        pi.status === "requires_payment_method" ||
        pi.status === "requires_confirmation" ||
        pi.status === "requires_action"
      ) {
        clientSecret = pi.client_secret ?? null;
      }
    } catch {
      clientSecret = null;
    }
  }
  return json(
    {
      order,
      clientSecret,
      publishableKey: cash ? null : stripePublishableKey(),
      requiresPayment: !cash && order.status === "PENDING_PAYMENT",
      replayed: true,
      wayPoints: { eligible: Boolean(order.wayPointsEligible) },
    },
    200,
  );
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail("Bestellung unvollständig.");

    const idempotencyKey = normalizeIdempotencyKey(parsed.data.idempotencyKey);
    if (parsed.data.idempotencyKey && !idempotencyKey) {
      return fail("Ungültiger Idempotency-Key.");
    }
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey, customerId: session.id },
        select: { id: true },
      });
      if (existing) return replayOrderResponse(existing.id);
    }

    if (session.role === "CUSTOMER") {
      const customer = await prisma.user.findUnique({
        where: { id: session.id },
        select: { phone: true },
      });
      if (!normalizePhone(customer?.phone ?? "")) {
        return fail("Bitte zuerst eine Telefonnummer hinterlegen.", 400);
      }
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: parsed.data.restaurantId },
      include: { serviceAreas: { select: { postalCode: true } } },
    });
    if (!restaurant) {
      return failCode("Restaurant nimmt gerade keine Bestellungen an.", "RESTAURANT_UNAVAILABLE");
    }

    const fulfillment = parseFulfillment(parsed.data.fulfillmentType);
    const pickup = fulfillment === "PICKUP";
    if (pickup && restaurant.pickupAllowed === false) {
      return fail("Dieses Restaurant bietet keine Abholung an.");
    }

    let scheduledFor: Date | null = null;
    const wantsPreorder = Boolean(parsed.data.scheduledFor && String(parsed.data.scheduledFor).trim());
    if (wantsPreorder) {
      const validated = validateScheduledFor({
        settings: restaurant,
        scheduledForIso: parsed.data.scheduledFor,
        fulfillmentType: fulfillment,
      });
      if (!validated.ok) return fail(validated.error);
      scheduledFor = validated.scheduledFor;
      if (restaurant.preorderMaxConcurrent != null && restaurant.preorderMaxConcurrent > 0) {
        const windowMs = 30 * 60_000;
        const from = new Date(scheduledFor.getTime() - windowMs);
        const to = new Date(scheduledFor.getTime() + windowMs);
        const concurrent = await prisma.order.count({
          where: {
            restaurantId: restaurant.id,
            scheduledFor: { gte: from, lte: to },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        });
        if (concurrent >= restaurant.preorderMaxConcurrent) {
          return fail("Für diesen Zeitraum sind keine weiteren Vorbestellungen möglich.");
        }
      }
    }

    const accepting = restaurantAcceptingOrders({
      isActive: restaurant.isActive,
      isOpen: restaurant.isOpen,
      wantsPreorder,
      preorderEnabled: restaurant.preorderEnabled,
    });
    if (!accepting.ok) return failCode(accepting.error, accepting.code);

    let street: string;
    let city: string;
    let postalCode: string;
    if (pickup) {
      street = restaurant.address;
      city = restaurant.city;
      postalCode = restaurant.postalCode;
    } else {
      const addr = assertDeliveryAddress({
        street: parsed.data.street,
        city: parsed.data.city,
        postalCode: parsed.data.postalCode,
      });
      if (!addr.ok) return failCode(addr.error, addr.code);
      street = addr.street;
      city = addr.city;
      postalCode = addr.postalCode;
      const cover = assertDeliveryCoverage({
        postalCode,
        restaurant: {
          lat: restaurant.lat,
          lng: restaurant.lng,
          maxDeliveryKm: restaurant.maxDeliveryKm,
          serviceAreas: restaurant.serviceAreas,
        },
      });
      if (!cover.ok) return failCode(cover.error, cover.code);
    }
    const deliveryFeeCents = pickup ? 0 : listedDeliveryFeeCents(restaurant);
    if (!pickup) {
      const feeCheck = assertDeliveryFeeMatches(
        deliveryFeeCents,
        parsed.data.expectedDeliveryFeeCents,
      );
      if (!feeCheck.ok) return failCode(feeCheck.error, feeCheck.code, 409);
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: parsed.data.items.map((i) => i.menuItemId) },
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });
    const cartCheck = assertCartLinesAgainstMenu({
      requested: parsed.data.items,
      menuItems,
    });
    if (!cartCheck.ok) {
      return failCode(cartCheck.error, cartCheck.code, 409, {
        changed: cartCheck.changed,
      });
    }
    const lines = cartCheck.lines;
    const foodSubtotalCents = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
    const minCheck = assertMinOrder(foodSubtotalCents, restaurant.minOrderCents);
    if (!minCheck.ok) return failCode(minCheck.error, minCheck.code);

    let coupon = null;
    let couponDiscountCents = 0;
    if (parsed.data.couponCode) {
      const validated = await validateRestaurantCoupon({
        restaurantId: restaurant.id,
        code: parsed.data.couponCode,
        foodSubtotalCents,
        fulfillmentType: fulfillment,
        customerId: session.id,
      });
      if (!validated.ok) return fail(validated.error);
      coupon = validated.coupon;
      couponDiscountCents = applyCoupon(foodSubtotalCents, coupon);
    }
    const participates = isWayPointsParticipating(restaurant);
    let wayPointsDiscountCents = 0;
    let wayPointsFundedBy: string | null = null;
    let wayPointsRestaurantShareCents = 0;
    let wayPointsLieferwayShareCents = 0;
    let wayPointsRewardId: string | null = null;
    let wayPointsRedeemed = 0;

    if (
      couponXorBlocks({
        hasCoupon: Boolean(parsed.data.couponCode),
        hasWayPoints: Boolean(parsed.data.wayPointsRewardId),
      })
    ) {
      return fail("Gutschein und WayPoints können nicht kombiniert werden.");
    }

    if (parsed.data.wayPointsRewardId) {
      const preview = await previewCheckoutReward({
        userId: session.id,
        restaurantId: restaurant.id,
        rewardId: parsed.data.wayPointsRewardId,
        foodSubtotalCents,
        couponDiscountCents,
        cartMenuItemIds: lines.map((l) => l.menuItemId),
      });
      if (!preview.ok) return fail(preview.error);
      wayPointsRewardId = preview.quote.rewardId;
      wayPointsDiscountCents = preview.quote.discountCents;
      wayPointsFundedBy = preview.quote.fundedBy;
      wayPointsRestaurantShareCents = preview.quote.restaurantShareCents;
      wayPointsLieferwayShareCents = preview.quote.lieferwayShareCents;
      wayPointsRedeemed = preview.quote.pointsCost;
    }

    const plan = checkoutDiscountPlan({
      foodSubtotalCents,
      couponDiscountCents,
      wayPointsDiscountCents,
      wayPointsLieferwayShareCents,
    });
    let discountCents = plan.customerDiscountCents;
    // Commission on food AFTER restaurant-funded Gutschein (not after WayPoints).
    const totals = computeOrderTotals({
      foodSubtotalCents,
      deliveryFeeCents,
      discountCents,
      commissionPercent: restaurant.commissionPercent,
      restaurantCouponCents: couponDiscountCents,
    });

    const method = parsed.data.paymentMethod;
    const cash = method === "CASH";
    const feeInput = {
      amountCents: totals.totalCents,
      // Commission base = food after restaurant coupon; platformAbsorbed excludes restaurant Gutscheine.
      foodSubtotalCents: totals.commissionBaseCents,
      commissionPercent: restaurant.commissionPercent,
      deliveryFeeCents,
      discountCents: plan.platformAbsorbedDiscountCents,
    };
    const fees = cash
      ? {
          netCommissionCents: totals.commissionCents,
          stripeFeeEstimatedCents: 0,
          applicationFeeCents: 0,
          restaurantTransferCents: totals.restaurantPayoutCents,
          platformNetCommissionCents: totals.commissionCents,
        }
      : computeApplicationFeeCents(feeInput);
    const applicationFeeCents = fees.applicationFeeCents;
    const restaurantNetCents = fees.restaurantTransferCents;

    if (!cash) {
      if (!isStripeConfigured()) {
        return fail("Kartenzahlung ist nicht konfiguriert (Stripe Test Mode).");
      }
      if (!canAcceptOnlinePayments(restaurant)) {
        return fail("Dieses Restaurant hat Stripe Connect noch nicht abgeschlossen.");
      }
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { name: parsed.data.customerName },
    });

    const shortCode = await uniqueShortCode();
    const status = cash ? "PLACED" : "PENDING_PAYMENT";
    const customer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { email: true },
    });

    let order: Awaited<ReturnType<typeof prisma.order.create>>;
    try {
      order = await prisma.order.create({
      data: {
        shortCode,
        idempotencyKey,
        customerId: session.id,
        restaurantId: restaurant.id,
        status,
        paymentMethod: method,
        paymentStatus: paymentStatusFor(method, false),
        stripePaymentIntentId: null,
        placedAt: cash ? new Date() : null,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        foodSubtotalCents,
        deliveryFeeCents,
        discountCents,
        totalCents: totals.totalCents,
        commissionPercent: restaurant.commissionPercent,
        commissionCents: totals.commissionCents,
        restaurantPayoutCents: totals.restaurantPayoutCents,
        applicationFeeCents,
        platformNetCommissionCents: fees.platformNetCommissionCents,
        stripeFeeEstimatedCents: fees.stripeFeeEstimatedCents,
        stripeFeeCents: fees.stripeFeeEstimatedCents,
        restaurantTransferCents: fees.restaurantTransferCents,
        restaurantNetCents,
        platformNetCents: fees.platformNetCommissionCents,
        payoutStatus: cash ? "NONE" : "UNPAID",
        street,
        city,
        postalCode,
        notes: parsed.data.notes,
        fulfillmentType: fulfillment,
        scheduledFor,
        wayPointsRewardId,
        wayPointsDiscountCents,
        wayPointsFundedBy,
        wayPointsRestaurantShareCents,
        wayPointsLieferwayShareCents,
        wayPointsRedeemed,
        wayPointsEligible: participates,
        items: { create: lines },
      },
      include: {
        items: true,
        restaurant: { select: { name: true, slug: true, imageUrl: true, address: true } },
      },
    });
    } catch (createErr) {
      const code =
        createErr && typeof createErr === "object" && "code" in createErr
          ? (createErr as { code?: string }).code
          : undefined;
      if (code === "P2002" && idempotencyKey) {
        const existing = await prisma.order.findFirst({
          where: { idempotencyKey, customerId: session.id },
          select: { id: true },
        });
        if (existing) return replayOrderResponse(existing.id);
      }
      const kind = isCriticalDatabaseError(createErr) ? "database_error" : "order_creation_failure";
      await alertCritical({
        kind,
        dedupeKey: `order_create:${session.id}:${idempotencyKey ?? Date.now()}`,
        detail: `prisma.order.create failed: ${safeErrorMessage(createErr)}`,
        restaurantId: restaurant.id,
        metadata: { prismaCode: code ?? null },
      });
      if (createErr && typeof createErr === "object") {
        (createErr as { __lwAlerted?: boolean }).__lwAlerted = true;
      }
      throw createErr;
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "fulfillmentType" = $1, "deliveryFeeCents" = $2, "totalCents" = $3, "street" = $4, "city" = $5, "postalCode" = $6, "discountCents" = $8, "applicationFeeCents" = $9, "wayPointsDiscountCents" = $10, "wayPointsFundedBy" = $11, "wayPointsRestaurantShareCents" = $12, "wayPointsLieferwayShareCents" = $13, "wayPointsRedeemed" = $14, "wayPointsEligible" = $15, "wayPointsRewardId" = $16 WHERE "id" = $7`,
      fulfillment,
      deliveryFeeCents,
      totals.totalCents,
      street,
      city,
      postalCode,
      order.id,
      discountCents,
      applicationFeeCents,
      wayPointsDiscountCents,
      wayPointsFundedBy,
      wayPointsRestaurantShareCents,
      wayPointsLieferwayShareCents,
      wayPointsRedeemed,
      participates,
      wayPointsRewardId,
    );

    if (coupon) {
      await recordCouponUsage({
        couponId: coupon.id,
        orderId: order.id,
        customerId: session.id,
      });
    }

    if (wayPointsRewardId) {
      const redeemed = await redeemRewardForOrder({
        userId: session.id,
        orderId: order.id,
        restaurantId: restaurant.id,
        rewardId: wayPointsRewardId,
        foodSubtotalCents,
        couponDiscountCents: allowCouponWayPointsStack() ? couponDiscountCents : 0,
        cartMenuItemIds: lines.map((l) => l.menuItemId),
      });
      if (!redeemed.ok) {
        await reverseCouponUsageForOrder(order.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentStatus: "FAILED" },
        });
        return fail(redeemed.error);
      }
    }

    let clientSecret: string | null = null;
    let paymentIntentId: string | null = null;
    if (!cash) {
      try {
        const intent = await createDestinationPaymentIntent({
          amountCents: totals.totalCents,
          applicationFeeCents,
          destinationAccountId: restaurant.stripeAccountId!,
          method,
          metadata: {
            orderId: order.id,
            restaurantId: restaurant.id,
            shortCode: order.shortCode,
          },
          customerEmail: customer?.email,
        });
        paymentIntentId = intent.id;
        clientSecret = intent.clientSecret;
        await prisma.order.update({
          where: { id: order.id },
          data: { stripePaymentIntentId: intent.id },
        });
      } catch (err) {
        await reverseCouponUsageForOrder(order.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentStatus: "FAILED" },
        });
        const msg = err instanceof Error ? err.message : "";
        await alertCritical({
          kind: "payment_capture_failure",
          dedupeKey: `pi_create:${order.id}`,
          detail: `createDestinationPaymentIntent failed: ${safeErrorMessage(err)}`,
          orderCode: order.shortCode,
          orderId: order.id,
          restaurantId: order.restaurantId,
        });
        return fail(msg === "STRIPE_UNCONFIGURED" ? "Stripe Test Mode ist nicht konfiguriert." : "Zahlung konnte nicht gestartet werden.", 502);
      }
    }

    if (cash) {
      const { notifyRestaurantOrders } = await import("@/lib/order-events");
      notifyRestaurantOrders(order.restaurantId);
      const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
      await notifyCustomerOfOrderStatus(order.id, "PLACED");
    }

    const settings = participates ? await getWayPointsSettings() : { pointsPerEuro: 0 };
    const multiplier = participates ? await bestEarnMultiplier(restaurant.id) : 1;
    const earnPreview = participates
      ? previewEarnPoints({
          foodSubtotalCents,
          pointsPerEuro: settings.pointsPerEuro,
          multiplier,
        })
      : 0;

    return json(
      {
        order: { ...order, status, stripePaymentIntentId: paymentIntentId },
        clientSecret,
        publishableKey: cash ? null : stripePublishableKey(),
        requiresPayment: !cash,
        wayPoints: participates
          ? {
              eligible: true,
              earnPreview,
              redeemed: wayPointsRedeemed,
              discountCents: wayPointsDiscountCents,
            }
          : { eligible: false },
      },
      201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    const already = e && typeof e === "object" && (e as { __lwAlerted?: boolean }).__lwAlerted;
    if (!already) {
      if (isCriticalDatabaseError(e)) {
        await alertCritical({
          kind: "database_error",
          dedupeKey: `orders_post_db:${Date.now()}`,
          detail: `POST /api/orders DB error: ${safeErrorMessage(e)}`,
        });
      } else {
        await alertCritical({
          kind: "order_creation_failure",
          dedupeKey: `orders_post:${safeErrorMessage(e).slice(0, 80)}:${Date.now()}`,
          detail: `POST /api/orders failed: ${safeErrorMessage(e)}`,
        });
      }
    }
    throw e;
  }
}
