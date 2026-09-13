import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import {
  findOwnedRestaurantForMenu,
  isAuthFailure,
  redirectMenu,
  redirectMenuError,
} from "@/lib/restaurant-menu-actions";

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    const priceCents = eurosToCents(String(form.get("price") ?? ""));
    const restaurant = await findOwnedRestaurantForMenu(session.id, session.role);
    if (!restaurant || !id || priceCents <= 0) {
      return redirectMenuError("Preis konnte nicht gespeichert werden.");
    }
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: restaurant.id },
      select: { id: true },
    });
    if (!existing) return redirectMenuError("Gericht nicht gefunden.");
    await prisma.menuItem.update({
      where: { id },
      data: { priceCents },
    });
    return redirectMenu("/restaurant/menu?ok=1");
  } catch (error) {
    console.error("[restaurant/menu/price]", error);
    if (isAuthFailure(error)) return redirectMenu("/login?next=/restaurant/menu");
    return redirectMenuError("Preis konnte nicht gespeichert werden.");
  }
}
