"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { CartPanel } from "@/components/cart-panel";

export function CartClient() {
  const { cart } = useCart();
  const { t } = useI18n();

  return (
    <main className="flex flex-1 flex-col justify-end bg-[#111827]/30">
      <div className="mx-auto flex w-full max-w-lg flex-col rounded-t-[28px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-16px_48px_rgba(17,24,39,0.2)]">
        <div className="flex justify-center pb-2" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-[#D1D5DB]" />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">{t.yourOrder}</h1>
        <div className="mt-3 min-h-[40vh]">
          <CartPanel />
        </div>
        {cart ? (
          <p className="mt-3 text-center text-sm text-[#6B7280]">
            <Link href={`/${cart.restaurantSlug}`} className="font-medium text-primary">
              {cart.restaurantName}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
