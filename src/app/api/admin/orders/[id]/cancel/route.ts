import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ADMIN_CANCELLABLE_STATUSES } from "@/lib/constants";
import { releaseOrderPayment } from "@/lib/payment-lifecycle";
import { writeAuditLog } from "@/lib/audit";

export async function OPTIONS() {
  return options();
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        shortCode: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        restaurantId: true,
      },
    });
    if (!order) return fail("Bestellung nicht gefunden.", 404);
    if (!(ADMIN_CANCELLABLE_STATUSES as readonly string[]).includes(order.status)) {
      return fail("Diese Bestellung kann nicht mehr storniert werden.");
    }

    const now = new Date();
    const claimed = await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "status" = $1, "updatedAt" = $2 WHERE "id" = $3 AND "status" = $4`,
      "CANCELLED",
      now,
      order.id,
      order.status,
    );
    if (!claimed) {
      return fail("Status hat sich geändert — bitte neu laden.", 409);
    }

    const { reverseCouponUsageForOrder } = await import("@/lib/coupons");
    await reverseCouponUsageForOrder(order.id);
    const { reverseWayPointsForOrder } = await import("@/lib/waypoints-service");
    await reverseWayPointsForOrder(order.id, "cancel");

    const release = await releaseOrderPayment({
      orderId: order.id,
      reason: "admin_cancel",
      full: true,
      stripeReason: "requested_by_customer",
    });
    if (!release.ok) {
      console.error("admin cancel payment release failed", release);
    }

    const { notifyRestaurantOrders } = await import("@/lib/order-events");
    notifyRestaurantOrders(order.restaurantId);
    const { notifyCustomerOfOrderStatus } = await import("@/lib/notify-customer");
    await notifyCustomerOfOrderStatus(order.id, "CANCELLED");

    await writeAuditLog({
      actor: session,
      action: "ORDER_CANCEL",
      entityType: "Order",
      entityId: order.id,
      summary: `Admin cancelled order ${order.shortCode}`,
      metadata: {
        shortCode: order.shortCode,
        previousStatus: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        release,
      },
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { paymentReleaseLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    return json({ order: updated, release });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("admin cancel", e);
    return fail(e instanceof Error ? e.message : "Stornierung fehlgeschlagen.", 500);
  }
}
