import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const restaurant = await findOwnedRestaurantForMenu(session.id, session.role);
    if (!restaurant || !id) return redirectMenuError("Status konnte nicht geändert werden.");
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: restaurant.id },
      select: { id: true, isAvailable: true },
    });
    if (!existing) return redirectMenuError("Gericht nicht gefunden.");
    await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
    });
    return redirectMenu("/restaurant/menu?ok=1");
  } catch (error) {
    console.error("[restaurant/menu/toggle]", error);
    if (isAuthFailure(error)) return redirectMenu("/login?next=/restaurant/menu");
    return redirectMenuError("Status konnte nicht geändert werden.");
  }
}
