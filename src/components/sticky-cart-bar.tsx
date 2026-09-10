"use client";

import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { interpolate } from "@/lib/i18n";

export function StickyCartBar() {
  const { count, foodSubtotal, cart, openCart, sheetOpen } = useCart();
  const { t, locale } = useI18n();
  const path = usePathname();

  if (count === 0 || !cart || sheetOpen) return null;
  if (path.startsWith("/cart") || path.startsWith("/checkout") || path.startsWith("/login")) {
    return null;
  }

  return (
    <>
      <div
        className="h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] px-3 py-2 md:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openCart();
          }}
          data-cart-trigger="bar"
          className="pointer-events-auto flex h-12 w-full cursor-pointer touch-manipulation items-center justify-between rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(146,42,73,0.35)]"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingBag className="size-4" />
            {t.cart}
          </span>
          <span>
            {interpolate(t.itemCount, { count: String(count) })} · {formatEUR(foodSubtotal, locale)}
          </span>
        </button>
      </div>
    </>
  );
}
