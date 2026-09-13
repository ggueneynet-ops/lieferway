import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { MenuEditor } from "@/components/menu-editor";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Cat = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    isAvailable: boolean;
    categoryId: string;
    imageUrl?: string | null;
  }[];
};

export default async function RestaurantMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; name?: string }>;
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

  let categories: Cat[] = [];
  let loadError = false;
  let itemCount = 0;
  try {
    // Flat queries — nested include/select on relations has been blanking the list in prod.
    const [catRows, itemRows] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id },
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
      }),
    ]);
    itemCount = itemRows.length;
    const byCat = new Map<string, Cat>();
    for (const c of catRows) {
      byCat.set(c.id, { id: c.id, name: c.name, items: [] });
    }
    for (const item of itemRows) {
      let bucket = byCat.get(item.categoryId);
      if (!bucket) {
        bucket = { id: item.categoryId, name: "—", items: [] };
        byCat.set(item.categoryId, bucket);
      }
      bucket.items.push(item);
    }
    categories = Array.from(byCat.values());
  } catch (error) {
    console.error("[restaurant/menu] categories failed", error);
    loadError = true;
    categories = [];
  }

  const savedName = typeof q.name === "string" && q.name.trim() ? q.name.trim() : "";

  return (
    <RestaurantAppShell title={`${t.menuTitle} · ${restaurant.name}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      {q.ok ? (
        <div
          className="mb-3 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          {savedName
            ? `${t.menuSavedOk} „${savedName}“ · ${itemCount} ${t.menuItemCountLabel}`
            : `${t.menuSavedOk} · ${itemCount} ${t.menuItemCountLabel}`}
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
      {!loadError && categories.length === 0 ? (
        <div className="mb-3 rounded-[1.35rem] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#6B7280]" role="status">
          {t.menuEmptyHint}
        </div>
      ) : null}
      <MenuEditor restaurantId={restaurant.id} categories={categories} cuisine={restaurant.cuisine} />
    </RestaurantAppShell>
  );
}
