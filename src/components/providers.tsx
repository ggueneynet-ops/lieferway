"use client";

import { CartProvider } from "@/components/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
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
      <CartProvider>{children}</CartProvider>
    </LocaleProvider>
  );
}
