"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";

export function CartButton({ compact = false }: { compact?: boolean }) {
  const { count } = useCart();
  const { t } = useI18n();

  if (compact) {
    return (
      <Link
        href="/cart"
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink hover:bg-muted"
        aria-label={t.cart}
      >
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-pressed sm:h-11"
    >
      <ShoppingBag className="size-4" />
      <span>{t.cart}</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-text-inverse">
          {count}
        </span>
      )}
    </Link>
  );
}
