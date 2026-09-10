"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { CartPanel } from "@/components/cart-panel";

export function CartClient() {
  const { cart } = useCart();
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t.yourOrder}</h1>
      <div className="mt-5 min-h-[50vh] rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
        <CartPanel />
      </div>
      {cart ? (
        <p className="mt-4 text-center text-sm text-[#6B7280]">
          <Link href={`/restaurants/${cart.restaurantSlug}`} className="font-medium text-primary">
            {cart.restaurantName}
          </Link>
        </p>
      ) : null}
    </main>
  );
}

export function CartPageShell() {
  return (
    <>
      <SiteHeader />
      <CartClient />
    </>
  );
}
