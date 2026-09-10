import { formatEUR } from "@/lib/money";
import { dishPhoto } from "@/lib/media";
import { getCopy } from "@/lib/get-locale";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  categoryId: string;
  imageUrl?: string | null;
};
type Category = { id: string; name: string; items: Item[] };

export async function MenuEditor({
  categories,
  cuisine,
}: {
  restaurantId?: string;
  categories: Category[];
  cuisine: string;
}) {
  const { t, locale } = await getCopy();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-[#E8C5D0]/70 bg-white p-5 shadow-[0_8px_24px_rgba(183,46,87,0.06)]">
        <h2 className="font-display text-xl font-semibold text-[#111827]">{t.addItem}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t.addItemHint}</p>
        <form action="/restaurant/menu/add" method="post" className="mt-5 space-y-4">
          <div>
            <label htmlFor="item-name" className="text-base font-medium">
              {t.name}
            </label>
            <input
              id="item-name"
              name="name"
              required
              minLength={2}
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              placeholder="z. B. Adana Kebap"
            />
          </div>
          <div>
            <label htmlFor="item-price" className="text-base font-medium">
              {t.price}
            </label>
            <input
              id="item-price"
              name="price"
              required
              inputMode="decimal"
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              placeholder="12,90"
            />
          </div>
          <div>
            <label htmlFor="item-cat" className="text-base font-medium">
              {t.category}
            </label>
            {categories.length > 0 && (
              <select
                id="item-cat"
                name="categoryId"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                defaultValue={categories[0]?.id}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <input
              name="categoryName"
              className="mt-2 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              placeholder={categories.length ? t.newCategoryHint : "Grill"}
            />
          </div>
          <div>
            <label htmlFor="item-photo" className="text-base font-medium">
              {t.photoOptional}
            </label>
            <input
              id="item-photo"
              name="imageUrl"
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              placeholder={t.photoHint}
            />
          </div>
          <button type="submit" className="h-14 w-full rounded-2xl bg-[#B72E57] text-base font-semibold text-white hover:bg-[#922546]">
            {t.save}
          </button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-[#111827]">{t.menuTitle}</h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-border bg-surface">
              <p className="border-b border-border px-4 py-3 font-medium">{cat.name}</p>
              {cat.items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-text-secondary">{t.noItems}</p>
              ) : (
                <ul>
                  {cat.items.map((item) => {
                    const photo = dishPhoto(item.imageUrl, cuisine, item.name);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className={item.isAvailable ? "font-medium" : "text-text-secondary line-through"}>
                            {item.name}
                          </p>
                          <p className="text-sm text-text-secondary">{formatEUR(item.priceCents, locale)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <form action="/restaurant/menu/price" method="post" className="flex items-center gap-1">
                            <input type="hidden" name="id" value={item.id} />
                            <label className="sr-only" htmlFor={`p-${item.id}`}>
                              {t.editPrice}
                            </label>
                            <input
                              id={`p-${item.id}`}
                              name="price"
                              inputMode="decimal"
                              defaultValue={(item.priceCents / 100).toFixed(2).replace(".", ",")}
                              className="h-11 w-[4.5rem] rounded-lg border border-border px-2 text-sm"
                            />
                            <button type="submit" className="h-11 rounded-xl bg-[#B72E57] px-3 text-sm font-semibold text-white">
                              {t.save}
                            </button>
                          </form>
                          <div className="flex gap-2">
                          <form action="/restaurant/menu/toggle" method="post">
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="h-11 rounded-xl border border-border px-3 text-sm">
                              {item.isAvailable ? t.rpSoldOut : t.rpAvailable}
                            </button>
                          </form>
                          <form action="/restaurant/menu/delete" method="post">
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="h-11 rounded-xl px-3 text-sm text-danger">
                              {t.delete}
                            </button>
                          </form>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
