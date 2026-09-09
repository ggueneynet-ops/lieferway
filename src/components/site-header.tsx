import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { LOCALE_COOKIE, PLZ_COOKIE, RADIUS_COOKIE } from "@/lib/constants";
import { parseLocale, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";
import { normalizePlz } from "@/lib/plz";
import { PlzForm } from "@/components/plz-form";
import { HomeSearch } from "@/components/home-search";
import { RadiusChips } from "@/components/radius-chips";
import { resolveUserRadius } from "@/lib/radius";

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
  const activePlz = plz ?? normalizePlz(cookieStore.get(PLZ_COOKIE)?.value);
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
