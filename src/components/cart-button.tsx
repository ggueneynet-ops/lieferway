"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";

export function CartButton() {
  const { count } = useCart();
  const { t } = useI18n();

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
    >
      <ShoppingBag className="size-4" />
      <span className="hidden sm:inline">{t.cart}</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-text-inverse">
          {count}
        </span>
      )}
    </Link>
  );
}
