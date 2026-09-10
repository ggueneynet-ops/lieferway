"use client";

import { CartProvider } from "@/components/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { StickyCartBar } from "@/components/sticky-cart-bar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import type { Locale } from "@/lib/i18n";

export function Providers({
  children,
  initialLocale = "de",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <CartProvider>
        {children}
        <StickyCartBar />
        <MobileTabBar />
      </CartProvider>
    </LocaleProvider>
  );
}
