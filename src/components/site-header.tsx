import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { CITY_COOKIE, LOCALE_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { parseLocale, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";
import { resolveUserRadius } from "@/lib/radius";
import { sanitizeDemoPlz } from "@/lib/plz";
import { PlzForm } from "@/components/plz-form";
import { HomeSearch } from "@/components/home-search";
import { RadiusChips } from "@/components/radius-chips";

export async function SiteHeader({
  plz,
  q,
  cuisine,
  km,
  showSearch = false,
}: {
  plz?: string | null;
  q?: string;
  cuisine?: string;
  km?: number | null;
  showSearch?: boolean;
} = {}) {
  const user = await getSession();
  const cookieStore = await cookies();
  const locale: Locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const hasStreet = Boolean(cookieStore.get(STREET_COOKIE)?.value?.trim());
  const activePlz = sanitizeDemoPlz(plz ?? cookieStore.get(PLZ_COOKIE)?.value, hasStreet);
  const activeKm =
    km !== undefined
      ? km
      : resolveUserRadius(null, cookieStore.get(RADIUS_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex h-12 items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
          <Logo size="sm" className="min-w-0" />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <LocaleToggle />
            <AccountMenu user={user} locale={locale} />
            <span className="sm:hidden">
              <CartButton compact />
            </span>
            <span className="hidden sm:inline-flex">
              <CartButton />
            </span>
          </div>
        </div>
        <div className="space-y-2 px-3 pb-3 sm:px-4">
          <PlzForm
            initialPlz={activePlz ?? ""}
            initialStreet={cookieStore.get(STREET_COOKIE)?.value ?? ""}
            initialCity={cookieStore.get(CITY_COOKIE)?.value ?? ""}
            q={q ?? ""}
            cuisine={cuisine ?? ""}
            km={activeKm}
            autoDetect={showSearch}
          />
          {activePlz ? (
            <RadiusChips plz={activePlz} q={q} cuisine={cuisine} km={activeKm} />
          ) : null}
          {showSearch ? (
            <HomeSearch initialQ={q ?? ""} plz={activePlz} cuisine={cuisine} km={activeKm} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
