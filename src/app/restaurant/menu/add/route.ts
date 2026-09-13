import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { dishPhoto } from "@/lib/media";
import {
  findOwnedRestaurantForMenu,
  isAuthFailure,
  redirectMenu,
  redirectMenuError,
} from "@/lib/restaurant-menu-actions";

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await findOwnedRestaurantForMenu(session.id, session.role);
    if (!restaurant) return redirectMenuError("Kein Restaurant gefunden.");

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const priceCents = eurosToCents(String(form.get("price") ?? ""));
    const categoryName = String(form.get("categoryName") ?? "").trim();
    let categoryId = String(form.get("categoryId") ?? "").trim();
    const imageRaw = String(form.get("imageUrl") ?? "").trim();

    if (name.length < 2 || priceCents <= 0) {
      return redirectMenuError("Name und Preis prüfen.");
    }

    if (categoryName) {
      const category = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: categoryName, sortOrder: 99 },
      });
      categoryId = category.id;
    }
    if (!categoryId) {
      const existing = await prisma.menuCategory.findFirst({
        where: { restaurantId: restaurant.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });
      if (existing) categoryId = existing.id;
    }
    if (!categoryId) {
      return redirectMenuError("Bitte eine Kategorie wählen oder neu anlegen.");
    }

    // Ensure category belongs to this restaurant (no cross-tenant id from tampered form).
    const catOk = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId: restaurant.id },
      select: { id: true },
    });
    if (!catOk) {
      return redirectMenuError("Kategorie ungültig. Bitte neu wählen.");
    }

    const imageUrl =
      imageRaw && (imageRaw.startsWith("/") || imageRaw.startsWith("http"))
        ? imageRaw
        : dishPhoto(null, restaurant.cuisine, name);

    const created = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name,
        description: "",
        priceCents,
        imageUrl,
        isAvailable: true,
      },
      select: { id: true, name: true },
    });

    const verify = await prisma.menuItem.findFirst({
      where: { id: created.id, restaurantId: restaurant.id },
      select: { id: true },
    });
    if (!verify) {
      console.error("[restaurant/menu/add] create returned but row missing", created.id);
      return redirectMenuError("Gericht wurde nicht gespeichert. Bitte erneut versuchen.");
    }

    const qs = new URLSearchParams({ ok: "1", name: created.name });
    return redirectMenu(`/restaurant/menu?${qs.toString()}`);
  } catch (error) {
    console.error("[restaurant/menu/add]", error);
    if (isAuthFailure(error)) {
      return redirectMenu("/login?next=/restaurant/menu");
    }
    const detail = error instanceof Error ? error.message : "";
    // Surface common prisma hints without leaking internals to strangers
    if (/Unique constraint|P2002/i.test(detail)) {
      return redirectMenuError("Dieses Gericht gibt es schon.");
    }
    if (/Foreign key|P2003/i.test(detail)) {
      return redirectMenuError("Kategorie ungültig. Bitte neu anlegen.");
    }
    return redirectMenuError("Gericht konnte nicht gespeichert werden. Bitte erneut versuchen.");
  }
}
