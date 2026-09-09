"use client";

import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
};
type Category = { id: string; name: string; items: Item[] };
type Restaurant = {
  id: string;
  slug: string;
  name: string;
  minOrderCents: number;
  deliveryFeeCents: number;
  isOpen: boolean;
  categories: Category[];
};

export function MenuClient({ restaurant }: { restaurant: Restaurant }) {
  const { add, cart, foodSubtotal, count } = useCart();
  const { t } = useI18n();
  const inThis = cart?.restaurantId === restaurant.id;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-10">
        {restaurant.categories.map((cat) => (
          <section key={cat.id} id={cat.id}>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">{cat.name}</h2>
            <div className="space-y-3">
              {cat.items.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-border bg-surface p-3 shadow-sm"
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="hidden h-24 w-28 rounded-xl object-cover sm:block"
                    />
                  )}
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-semibold">{formatEUR(item.priceCents)}</span>
                      <Button
                        size="sm"
                        disabled={!restaurant.isOpen || !item.isAvailable}
                        onClick={() => {
                          const same = add(
                            {
                              restaurantId: restaurant.id,
                              restaurantSlug: restaurant.slug,
                              restaurantName: restaurant.name,
                              minOrderCents: restaurant.minOrderCents,
                              deliveryFeeCents: restaurant.deliveryFeeCents,
                            },
                            {
                              menuItemId: item.id,
                              name: item.name,
                              priceCents: item.priceCents,
                              imageUrl: item.imageUrl,
                            },
                          );
                          if (!same) {
                            toast.message("Warenkorb ersetzt", {
                              description: "Nur ein Restaurant pro Bestellung – vorheriger Warenkorb geleert.",
                            });
                          } else {
                            toast.success(`${item.name} ${t.add.toLowerCase()}`);
                          }
                        }}
                      >
                        {item.isAvailable ? t.add : t.unavailable}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">{t.cart}</h2>
        {!inThis || count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t.emptyCart}</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2 text-sm">
              {cart!.items.map((i) => (
                <li key={i.menuItemId} className="flex justify-between gap-2">
                  <span>
                    {i.quantity}× {i.name}
                  </span>
                  <span>{formatEUR(i.priceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between text-sm">
              <span>{t.subtotal}</span>
              <span>{formatEUR(foodSubtotal)}</span>
            </p>
            <p className="flex justify-between text-sm text-muted-foreground">
              <span>{t.fee}</span>
              <span>{formatEUR(cart!.deliveryFeeCents)}</span>
            </p>
            <Button asChild className="mt-4 w-full">
              <Link href="/checkout">{t.checkout}</Link>
            </Button>
          </>
        )}
      </aside>
    </div>
  );
}
