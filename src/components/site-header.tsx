import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/constants";
import { parseLocale, t, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";

export async function SiteHeader() {
  const user = await getSession();
  const cookieStore = await cookies();
  const locale: Locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const copy = t(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm text-ink sm:flex">
          <span className="size-1.5 rounded-full bg-primary" />
          {copy.city}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleToggle />
          <AccountMenu user={user} locale={locale} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
