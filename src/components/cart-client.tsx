"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";

export function CartClient() {
  const { cart, setQty, foodSubtotal, clear } = useCart();
  const { t, locale } = useI18n();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t.cart}</h1>
      {!cart ? (
        <div className="mt-8 rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
          <p className="text-muted-foreground">{t.emptyCart}</p>
          <Button asChild className="mt-4">
            <Link href="/">{t.discoverRestaurants}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {cart.restaurantName} · {t.minOrder} {formatEUR(cart.minOrderCents, locale)}
          </p>
          <p className="rounded-2xl border border-primary/15 bg-primary-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">
            {t.restaurantDelivers} {t.restaurantDeliversHint}
          </p>
          <ul className="divide-y divide-border/80 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {cart.items.map((item) => (
              <li key={item.menuItemId} className="flex items-center justify-between gap-3 p-4">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover sm:h-14 sm:w-14" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatEUR(item.priceCents, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setQty(item.menuItemId, item.quantity - 1)}>
                    −
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => setQty(item.menuItemId, item.quantity + 1)}>
                    +
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-border bg-white p-5 text-sm shadow-sm">
            <p className="flex justify-between">
              <span>{t.subtotal}</span>
              <span>{formatEUR(foodSubtotal, locale)}</span>
            </p>
            <p className="mt-1 flex justify-between text-muted-foreground">
              <span>{t.fee}</span>
              <span>{formatEUR(cart.deliveryFeeCents, locale)}</span>
            </p>
            <p className="mt-2 flex justify-between font-semibold">
              <span>{t.total}</span>
              <span>{formatEUR(foodSubtotal + cart.deliveryFeeCents, locale)}</span>
            </p>
            {foodSubtotal < cart.minOrderCents && (
              <p className="mt-2 text-destructive">
                {t.remainingMin.replace("{amount}", formatEUR(cart.minOrderCents - foodSubtotal, locale))}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear}>
              {t.clearCart}
            </Button>
            <Button asChild className="flex-1" disabled={foodSubtotal < cart.minOrderCents}>
              <Link href="/checkout">{t.checkout}</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
