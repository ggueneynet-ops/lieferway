import { z } from "zod";
import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { applyCoupon, computeOrderTotals, couponBelowMinimum, paymentStatusFor, uniqueShortCode } from "@/lib/orders";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";
import { PAYMENT_METHODS } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { parseFulfillment } from "@/lib/fulfillment";
import { createDestinationPaymentIntent } from "@/lib/payments";
import { computeApplicationFeeCents } from "@/lib/stripe-fees";
import { canAcceptOnlinePayments } from "@/lib/stripe-connect";
import { isStripeConfigured, stripePublishableKey } from "@/lib/stripe";

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
  items: z.array(z.object({ menuItemId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentIntentId: z.string().optional(),
  customerName: z.string().trim().min(2).max(80),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail("Bestellung unvollständig.");

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
    });
    if (!restaurant || !restaurant.isActive || !restaurant.isOpen) {
      return fail("Restaurant nimmt gerade keine Bestellungen an.");
    }

    const fulfillment = parseFulfillment(parsed.data.fulfillmentType);
    const pickup = fulfillment === "PICKUP";
    if (pickup && restaurant.pickupAllowed === false) {
      return fail("Dieses Restaurant bietet keine Abholung an.");
    }
    const street = pickup
      ? restaurant.address
      : (parsed.data.street ?? "").trim();
    const city = pickup ? restaurant.city : (parsed.data.city ?? "").trim();
    const postalCode = pickup ? restaurant.postalCode : (parsed.data.postalCode ?? "").trim();
    if (!pickup && (street.length < 3 || city.length < 2 || postalCode.length < 4)) {
      return fail("Bitte Lieferadresse angeben.");
    }
    const deliveryFeeCents = pickup ? 0 : listedDeliveryFeeCents(restaurant);

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: parsed.data.items.map((i) => i.menuItemId) },
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });
    if (menuItems.length !== parsed.data.items.length) {
      return fail("Ein Artikel ist nicht mehr verfügbar.");
    }

    const lines = parsed.data.items.map((line) => {
      const item = menuItems.find((m) => m.id === line.menuItemId)!;
      return {
        menuItemId: item.id,
        name: item.name,
        priceCents: item.priceCents,
        quantity: line.quantity,
      };
    });
    const foodSubtotalCents = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
    if (foodSubtotalCents < restaurant.minOrderCents) {
      return fail("Mindestbestellwert nicht erreicht.");
    }

    let coupon = null;
    if (parsed.data.couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: parsed.data.couponCode.trim().toUpperCase() },
      });
      if (!coupon || !coupon.isActive) return fail("Gutschein ungültig.");
      if (couponBelowMinimum(foodSubtotalCents, coupon)) {
        return fail("Mindestbestellwert für diesen Gutschein nicht erreicht.");
      }
    }
    const discountCents = applyCoupon(foodSubtotalCents, coupon);
    const totals = computeOrderTotals({
      foodSubtotalCents,
      deliveryFeeCents,
      discountCents,
      commissionPercent: restaurant.commissionPercent,
    });

    const method = parsed.data.paymentMethod;
    const cash = method === "CASH";
    const fees = cash
      ? {
          netCommissionCents: totals.commissionCents,
          stripeFeeEstimatedCents: 0,
          applicationFeeCents: 0,
          restaurantTransferCents: totals.restaurantPayoutCents,
          platformNetCommissionCents: totals.commissionCents,
        }
      : computeApplicationFeeCents({
          amountCents: totals.totalCents,
          foodSubtotalCents,
          commissionPercent: restaurant.commissionPercent,
          deliveryFeeCents,
          discountCents,
        });
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

    const order = await prisma.order.create({
      data: {
        shortCode,
        customerId: session.id,
        restaurantId: restaurant.id,
        status,
        paymentMethod: method,
        paymentStatus: paymentStatusFor(method, false),
        stripePaymentIntentId: null,
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
        items: { create: lines },
      },
      include: {
        items: true,
        restaurant: { select: { name: true, slug: true, imageUrl: true, address: true } },
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "fulfillmentType" = $1, "deliveryFeeCents" = $2, "totalCents" = $3, "street" = $4, "city" = $5, "postalCode" = $6 WHERE "id" = $7`,
      fulfillment,
      deliveryFeeCents,
      totals.totalCents,
      street,
      city,
      postalCode,
      order.id,
    );

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
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentStatus: "FAILED" },
        });
        const msg = err instanceof Error ? err.message : "";
        return fail(msg === "STRIPE_UNCONFIGURED" ? "Stripe Test Mode ist nicht konfiguriert." : "Zahlung konnte nicht gestartet werden.", 502);
      }
    }

    if (cash) {
      const { notifyRestaurantOrders } = await import("@/lib/order-events");
      notifyRestaurantOrders(order.restaurantId);
      const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
      await notifyCustomerOfOrderStatus(order.id, "PLACED");
    }

    return json(
      {
        order: { ...order, status, stripePaymentIntentId: paymentIntentId },
        clientSecret,
        publishableKey: cash ? null : stripePublishableKey(),
        requiresPayment: !cash,
      },
      201,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
