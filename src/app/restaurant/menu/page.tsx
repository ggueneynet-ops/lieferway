import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { MenuEditor } from "@/components/menu-editor";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const q = await searchParams;
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.menuTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  let categories: Parameters<typeof MenuEditor>[0]["categories"] = [];
  let loadError = false;
  try {
    // Do NOT load via restaurant.findUnique({ include }) — that SELECTs every
    // Restaurant scalar and blanks the Speisekarte if prod is one migration behind.
    const rows = await prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        items: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            isAvailable: true,
            categoryId: true,
            imageUrl: true,
          },
        },
      },
    });
    categories = JSON.parse(JSON.stringify(rows));
  } catch (error) {
    console.error("[restaurant/menu] categories failed", error);
    loadError = true;
    categories = [];
  }

  return (
    <RestaurantAppShell title={`${t.menuTitle} · ${restaurant.name}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      {q.ok ? (
        <div
          className="mb-3 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          {t.menuSavedOk}
        </div>
      ) : null}
      {q.error ? (
        <div
          className="mb-3 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {q.error}
        </div>
      ) : null}
      {loadError ? (
        <div
          className="mb-3 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {t.restaurantLoadError}
        </div>
      ) : null}
      <MenuEditor restaurantId={restaurant.id} categories={categories} cuisine={restaurant.cuisine} />
    </RestaurantAppShell>
  );
}
