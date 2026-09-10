import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshRestaurantRating } from "@/lib/reviews";

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const body = (await req.json().catch(() => null)) as {
      orderId?: string;
      rating?: number;
      comment?: string;
    } | null;
    const orderId = body?.orderId?.trim();
    const rating = Number(body?.rating);
    const comment = body?.comment?.trim() || null;
    if (!orderId) return fail("Bestellung fehlt.");
    if (![1, 2, 3, 4, 5].includes(rating)) return fail("Bitte 1 bis 5 Sterne wählen.");
    if (comment && comment.length > 800) return fail("Kommentar ist zu lang.");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });
    if (!order) return fail("Bestellung nicht gefunden.", 404);
    if (session.role === "CUSTOMER" && order.customerId !== session.id) {
      return fail("Keine Berechtigung.", 403);
    }
    if (order.status !== "DELIVERED") {
      return fail("Bewerten geht erst nach der Lieferung.");
    }
    if (order.review) return fail("Du hast diese Bestellung bereits bewertet.");

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        rating,
        comment,
      },
    });
    await refreshRestaurantRating(order.restaurantId);
    return json({ ok: true, review }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("POST /api/reviews", e);
    return fail("Bewertung konnte nicht gespeichert werden.", 500);
  }
}
