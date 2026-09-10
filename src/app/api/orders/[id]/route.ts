import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { regeneratePayouts } from "@/lib/payouts";
import type { OrderStatus, Role } from "@/lib/constants";

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

    if (action === "accept" && (isOwner || isAdmin) && order.status === "PLACED") {
      status = "ACCEPTED";
      acceptedAt = new Date();
    } else if (action === "reject" && (isOwner || isAdmin) && order.status === "PLACED") {
      status = "REJECTED";
    } else if (action === "preparing" && (isOwner || isAdmin) && ["ACCEPTED", "PLACED"].includes(order.status)) {
      status = "PREPARING";
      acceptedAt = acceptedAt ?? new Date();
    } else if (action === "ready" && (isOwner || isAdmin) && ["PREPARING", "ACCEPTED"].includes(order.status)) {
      status = "READY";
    } else if (action === "claim" && (isCourier || isAdmin) && order.status === "READY" && !order.courierId) {
      courierId = isAdmin && body?.courierId ? body.courierId : session.role === "COURIER" ? session.id : body?.courierId ?? null;
      if (!courierId) return fail("Kurier fehlt.");
    } else if (action === "assign" && isAdmin) {
      courierId = body?.courierId ?? null;
    } else if (action === "out" && (isCourier || isAdmin || isOwner) && order.status === "READY") {
      if (isCourier && order.courierId && order.courierId !== session.id) return fail("Andere Tour.");
      if (isCourier && !order.courierId) courierId = session.id;
      status = "OUT_FOR_DELIVERY";
    } else if (action === "deliver" && (isCourier || isAdmin || isOwner) && order.status === "OUT_FOR_DELIVERY") {
      if (isCourier && order.courierId && order.courierId !== session.id) return fail("Andere Tour.");
      status = "DELIVERED";
      deliveredAt = new Date();
    } else if (action === "cancel" && isCustomer && order.status === "PLACED") {
      status = "CANCELLED";
    } else {
      return fail("Diese Statusänderung ist nicht erlaubt.");
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status, courierId, acceptedAt, deliveredAt },
      include,
    });

    if (updated.status === "DELIVERED") {
      await regeneratePayouts();
    }

    const { notifyRestaurantOrders } = await import("@/lib/order-events");
    notifyRestaurantOrders(updated.restaurantId);

    return json({ order: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
