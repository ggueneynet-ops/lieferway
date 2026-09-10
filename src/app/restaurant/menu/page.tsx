import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { MenuEditor } from "@/components/menu-editor";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantMenuPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.menuTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const full = await prisma.restaurant.findUnique({
    where: { id: restaurant.id },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { name: "asc" } } } },
    },
  });

  return (
    <RestaurantAppShell title={`${t.menuTitle} · ${restaurant.name}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <MenuEditor
        restaurantId={restaurant.id}
        categories={JSON.parse(JSON.stringify(full?.categories ?? []))}
        cuisine={restaurant.cuisine}
      />
    </RestaurantAppShell>
  );
}
