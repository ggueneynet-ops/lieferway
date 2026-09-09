import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { LOCALE_COOKIE, PLZ_COOKIE } from "@/lib/constants";
import { parseLocale, t, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";
import { normalizePlz } from "@/lib/plz";
import { MapPin } from "lucide-react";
import Link from "next/link";

export async function SiteHeader({ plz }: { plz?: string | null } = {}) {
  const user = await getSession();
  const cookieStore = await cookies();
  const locale: Locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const copy = t(locale);
  const activePlz = plz ?? normalizePlz(cookieStore.get(PLZ_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <Link
          href="/#lieferung"
          className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm text-ink hover:bg-primary/15 sm:flex"
        >
          <MapPin className="size-3.5 text-primary" />
          {activePlz ?? copy.city}
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/#lieferung"
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-ink sm:hidden"
          >
            <MapPin className="size-3 text-primary" />
            {activePlz ?? "PLZ"}
          </Link>
          <LocaleToggle />
          <AccountMenu user={user} locale={locale} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
