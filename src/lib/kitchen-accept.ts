import { prisma } from "@/lib/prisma";
import { parsePrepMinutes } from "@/lib/prep";
import { kitchenOrderInclude, serializeKitchenOrder, type KitchenOrder } from "@/lib/restaurant-live";
import { notifyRestaurantOrders } from "@/lib/order-events";
import { notifyCustomerOfOrderStatus } from "@/lib/notify-customer";

export async function acceptKitchenOrder(opts: {
  orderId: string;
  ownerUserId: string;
  role: string;
  prepMinutes: unknown;
}): Promise<{ order: KitchenOrder } | { error: string; status: number }> {
  const mins = parsePrepMinutes(opts.prepMinutes);
  if (mins == null) {
    return { error: "Bitte Zubereitungszeit zwischen 5 und 180 Minuten angeben.", status: 400 };
  }

  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { restaurant: { select: { id: true, ownerId: true } } },
  });
  if (!order) return { error: "Bestellung nicht gefunden.", status: 404 };

  const isOwner = order.restaurant.ownerId === opts.ownerUserId;
  const isAdmin = opts.role === "ADMIN";
  if (!isOwner && !isAdmin) return { error: "Keine Berechtigung.", status: 403 };

  const now = new Date();
  const alreadyInKitchen = order.status === "PREPARING" || order.status === "ACCEPTED";
  if (order.status === "PENDING_PAYMENT") {
    return { error: "Zahlung steht noch aus — Auftrag noch nicht in der Küche.", status: 400 };
  }
  if (order.status === "PLACED" || alreadyInKitchen) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "status" = $1, "prepMinutes" = $2, "acceptedAt" = COALESCE("acceptedAt", $3), "updatedAt" = $4 WHERE "id" = $5`,
      "PREPARING",
      mins,
      now,
      now,
      order.id,
    );
  } else {
    return { error: "Diese Bestellung kann nicht mehr angenommen werden.", status: 400 };
  }

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: kitchenOrderInclude,
  });
  if (!updated) return { error: "Bestellung nicht gefunden.", status: 404 };

  notifyRestaurantOrders(updated.restaurantId);
  await notifyCustomerOfOrderStatus(updated.id, updated.status);
  return { order: serializeKitchenOrder(updated) };
}
