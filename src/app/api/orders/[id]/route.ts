import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { regeneratePayouts } from "@/lib/payouts";
import type { OrderStatus, Role } from "@/lib/constants";
import { parsePrepMinutes } from "@/lib/prep";
import { isPickup } from "@/lib/fulfillment";

export async function OPTIONS() {
  return options();
}

const include = {
  items: true,
  restaurant: { select: { name: true, slug: true, imageUrl: true, address: true, postalCode: true } },
  customer: { select: { name: true, email: true, phone: true } },
  courier: { select: { name: true, phone: true } },
} as const;

function canView(role: Role, userId: string, order: { customerId: string; courierId: string | null; restaurant: { ownerId?: string } | null }, ownerId?: string) {
  if (role === "ADMIN") return true;
  if (role === "CUSTOMER") return order.customerId === userId;
  if (role === "COURIER") return order.courierId === userId || !order.courierId;
  if (role === "RESTAURANT") return ownerId === userId;
  return false;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      ...include,
      restaurant: { select: { name: true, slug: true, imageUrl: true, address: true, postalCode: true, ownerId: true } },
    },
  });
  if (!order) return fail("Bestellung nicht gefunden.", 404);
  if (!canView(session.role, session.id, order, order.restaurant.ownerId)) {
    return fail("Keine Berechtigung.", 403);
  }
  return json({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as {
      action?: string;
      courierId?: string;
      prepMinutes?: number | string;
    } | null;
    const action = body?.action;
    if (!action) return fail("Aktion fehlt.");

    const order = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!order) return fail("Bestellung nicht gefunden.", 404);

    const isOwner = order.restaurant.ownerId === session.id;
    const isCourier = session.role === "COURIER";
    const isAdmin = session.role === "ADMIN";
    const isCustomer = session.role === "CUSTOMER" && order.customerId === session.id;

    let status: OrderStatus = order.status as OrderStatus;
    let courierId = order.courierId;
    let acceptedAt = order.acceptedAt;
    let deliveredAt = order.deliveredAt;

    let prepMinutes = order.prepMinutes;

    if (action === "accept" && (isOwner || isAdmin) && order.status === "PLACED") {
      const mins = parsePrepMinutes(body?.prepMinutes);
      if (mins == null) {
        return fail("Bitte Zubereitungszeit zwischen 5 und 180 Minuten angeben.");
      }
      prepMinutes = mins;
      status = "PREPARING";
      acceptedAt = new Date();
    } else if (action === "reject" && (isOwner || isAdmin) && order.status === "PLACED") {
      status = "REJECTED";
    } else if (action === "preparing" && (isOwner || isAdmin) && ["ACCEPTED", "PLACED"].includes(order.status)) {
      const mins = parsePrepMinutes(body?.prepMinutes);
      if (mins == null) {
        return fail("Bitte Zubereitungszeit zwischen 5 und 180 Minuten angeben.");
      }
      prepMinutes = mins;
      status = "PREPARING";
      acceptedAt = acceptedAt ?? new Date();
    } else if (action === "ready" && (isOwner || isAdmin) && ["PREPARING", "ACCEPTED"].includes(order.status)) {
      status = "READY";
    } else if (action === "claim" && (isCourier || isAdmin) && order.status === "READY" && !order.courierId) {
      if (isPickup(order.fulfillmentType)) return fail("Abholung — keine Kurier-Tour.");
      courierId = isAdmin && body?.courierId ? body.courierId : session.role === "COURIER" ? session.id : body?.courierId ?? null;
      if (!courierId) return fail("Kurier fehlt.");
    } else if (action === "assign" && isAdmin) {
      courierId = body?.courierId ?? null;
    } else if (action === "out" && (isCourier || isAdmin || isOwner) && order.status === "READY") {
      if (isPickup(order.fulfillmentType)) return fail("Abholung — keine Auslieferung.");
      if (isCourier && order.courierId && order.courierId !== session.id) return fail("Andere Tour.");
      if (isCourier && !order.courierId) courierId = session.id;
      status = "OUT_FOR_DELIVERY";
    } else if (
      action === "deliver" &&
      (isCourier || isAdmin || isOwner) &&
      (order.status === "OUT_FOR_DELIVERY" || (isPickup(order.fulfillmentType) && order.status === "READY"))
    ) {
      if (isCourier && order.courierId && order.courierId !== session.id) return fail("Andere Tour.");
      status = "DELIVERED";
      deliveredAt = new Date();
    } else if (action === "cancel" && isCustomer && order.status === "PLACED") {
      status = "CANCELLED";
    } else {
      return fail("Diese Statusänderung ist nicht erlaubt.");
    }

    // Prisma 6's update() validator in the long-lived Next worker rejects scalar
    // FKs and sometimes newer columns (prepMinutes). Write via bound SQL, then read.
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "status" = ?, "prepMinutes" = ?, "acceptedAt" = ?, "deliveredAt" = ?, "courierId" = ?, "updatedAt" = ? WHERE "id" = ?`,
      status,
      prepMinutes,
      acceptedAt ? acceptedAt.toISOString() : null,
      deliveredAt ? deliveredAt.toISOString() : null,
      courierId,
      new Date().toISOString(),
      id,
    );

    const updated = await prisma.order.findUnique({
      where: { id },
      include,
    });
    if (!updated) return fail("Bestellung nicht gefunden.", 404);

    if (updated.status === "DELIVERED") {
      await regeneratePayouts();
    }

    const { notifyRestaurantOrders } = await import("@/lib/order-events");
    notifyRestaurantOrders(updated.restaurantId);
    const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
    await notifyCustomerOfOrderStatus(updated.id, updated.status);

    return json({
      order: JSON.parse(
        JSON.stringify(updated, (_k, v) => (v instanceof Date ? v.toISOString() : v)),
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("PATCH /api/orders/[id]", e);
    return fail("Bestellung konnte nicht aktualisiert werden.", 500);
  }
}
