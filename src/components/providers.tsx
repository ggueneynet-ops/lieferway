"use client";

import { CartProvider } from "@/components/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { StickyCartBar } from "@/components/sticky-cart-bar";
import { CartSheet } from "@/components/cart-sheet";
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
        <CartSheet />
        <StickyCartBar />
        <MobileTabBar />
      </CartProvider>
    </LocaleProvider>
  );
}
