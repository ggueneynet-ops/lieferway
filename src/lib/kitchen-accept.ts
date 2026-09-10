import { prisma } from "@/lib/prisma";
import { parsePrepMinutes } from "@/lib/prep";
import { kitchenOrderInclude, serializeKitchenOrder, type KitchenOrder } from "@/lib/restaurant-live";
import { notifyRestaurantOrders } from "@/lib/order-events";

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

  const now = new Date().toISOString();
  const alreadyInKitchen = order.status === "PREPARING" || order.status === "ACCEPTED";
  if (order.status === "PLACED" || alreadyInKitchen) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "status" = ?, "prepMinutes" = ?, "acceptedAt" = COALESCE("acceptedAt", ?), "updatedAt" = ? WHERE "id" = ?`,
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
  return { order: serializeKitchenOrder(updated) };
}
