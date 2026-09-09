"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { interpolate } from "@/lib/i18n";

export function StickyCartBar() {
  const { count, foodSubtotal, cart } = useCart();
  const { t, locale } = useI18n();
  const path = usePathname();

  if (count === 0 || !cart) return null;
  if (path.startsWith("/cart") || path.startsWith("/checkout") || path.startsWith("/login")) {
    return null;
  }

  return (
    <>
      <div className="h-[4.5rem] md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
        <Link
          href="/cart"
          className="flex h-12 items-center justify-between rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingBag className="size-4" />
            {t.goToCart}
          </span>
          <span>
            {interpolate(t.itemCount, { count: String(count) })} · {formatEUR(foodSubtotal, locale)}
          </span>
        </Link>
      </div>
    </>
  );
}
