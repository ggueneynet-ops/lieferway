import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { MenuEditor } from "@/components/menu-editor";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

type CatRow = { id: string; name: string };
type ItemRow = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  categoryId: string;
  imageUrl: string | null;
};

async function loadMenuBoard(restaurantId: string): Promise<{ categories: Cat[]; itemCount: number }> {
  // Raw SQL: Prisma findMany on these models has been throwing in production
  // (empty Speisekarte + yellow banner) even while INSERT via create succeeds.
  const catRows = await prisma.$queryRaw<CatRow[]>`
    SELECT id, name
    FROM "MenuCategory"
    WHERE "restaurantId" = ${restaurantId}
    ORDER BY "sortOrder" ASC, name ASC
  `;
  const itemRows = await prisma.$queryRaw<ItemRow[]>`
    SELECT id, name, description, "priceCents", "isAvailable", "categoryId", "imageUrl"
    FROM "MenuItem"
    WHERE "restaurantId" = ${restaurantId}
    ORDER BY name ASC
  `;

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
    bucket.items.push({
      id: item.id,
      name: item.name,
      description: item.description,
      priceCents: Number(item.priceCents),
      isAvailable: Boolean(item.isAvailable),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl,
    });
  }
  return { categories: Array.from(byCat.values()), itemCount: itemRows.length };
}

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
  let loadDetail = "";
  let itemCount = 0;
  try {
    const board = await loadMenuBoard(restaurant.id);
    categories = board.categories;
    itemCount = board.itemCount;
  } catch (error) {
    console.error("[restaurant/menu] loadMenuBoard failed", error);
    loadError = true;
    categories = [];
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      loadDetail = `${error.code}`;
    } else if (error instanceof Error && error.message) {
      loadDetail = error.message.slice(0, 120);
    }
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
          {loadDetail ? <span className="mt-1 block font-mono text-[11px] text-amber-800/80">{loadDetail}</span> : null}
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
