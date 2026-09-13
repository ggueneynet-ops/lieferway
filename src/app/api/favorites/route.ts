import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const rows = await prisma.favoriteRestaurant.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            cuisine: true,
            imageUrl: true,
            logoUrl: true,
            rating: true,
            reviewCount: true,
            deliveryFeeCents: true,
            minOrderCents: true,
            etaMin: true,
            etaMax: true,
            isOpen: true,
            isActive: true,
            launchWeekFreeDelivery: true,
            wayPointsEnabled: true,
            wayPointsDisabledByAdmin: true,
            pickupAllowed: true,
            city: true,
            postalCode: true,
          },
        },
      },
    });
    const favorites = rows
      .filter((r) => r.restaurant.isActive)
      .map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        restaurant: {
          ...r.restaurant,
          deliveryFeeCents: listedDeliveryFeeCents(r.restaurant),
        },
      }));
    return json({ favorites });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const bodySchema = z.object({
  restaurantId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fail("Restaurant fehlt.");
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: parsed.data.restaurantId },
      select: { id: true, isActive: true },
    });
    if (!restaurant || !restaurant.isActive) return fail("Restaurant nicht gefunden.", 404);
    const fav = await prisma.favoriteRestaurant.upsert({
      where: {
        userId_restaurantId: { userId: session.id, restaurantId: restaurant.id },
      },
      create: { userId: session.id, restaurantId: restaurant.id },
      update: {},
    });
    return json({ favorite: fav }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurantId") ?? "";
    if (!restaurantId) return fail("Restaurant fehlt.");
    await prisma.favoriteRestaurant.deleteMany({
      where: { userId: session.id, restaurantId },
    });
    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
