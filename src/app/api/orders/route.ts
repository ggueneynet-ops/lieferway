import { z } from "zod";
import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { applyCoupon, computeOrderTotals, couponBelowMinimum, paymentStatusFor, uniqueShortCode } from "@/lib/orders";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";
import { PAYMENT_METHODS } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { parseFulfillment } from "@/lib/fulfillment";

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
            ? { restaurant: { ownerId: session.id } }
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
    const paid = method !== "CASH";
    if (paid && !parsed.data.paymentIntentId) {
      return fail("Zahlung nicht bestätigt.");
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { name: parsed.data.customerName },
    });

    const order = await prisma.order.create({
      data: {
        shortCode: await uniqueShortCode(),
        customerId: session.id,
        restaurantId: restaurant.id,
        status: "PLACED",
        paymentMethod: method,
        paymentStatus: paymentStatusFor(method, paid),
        stripePaymentIntentId: parsed.data.paymentIntentId ?? null,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        foodSubtotalCents,
        deliveryFeeCents,
        discountCents,
        totalCents: totals.totalCents,
        commissionPercent: restaurant.commissionPercent,
        commissionCents: totals.commissionCents,
        restaurantPayoutCents: totals.restaurantPayoutCents,
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
      `UPDATE "Order" SET "fulfillmentType" = ?, "deliveryFeeCents" = ?, "totalCents" = ?, "street" = ?, "city" = ?, "postalCode" = ? WHERE "id" = ?`,
      fulfillment,
      deliveryFeeCents,
      totals.totalCents,
      street,
      city,
      postalCode,
      order.id,
    );

    const { notifyRestaurantOrders } = await import("@/lib/order-events");
    notifyRestaurantOrders(order.restaurantId);
    const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
    await notifyCustomerOfOrderStatus(order.id, "PLACED");

    return json({ order }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
