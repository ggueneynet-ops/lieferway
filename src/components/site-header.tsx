import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { CITY_COOKIE, LOCALE_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { parseLocale, type Locale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";
import { resolveUserRadius } from "@/lib/radius";
import { sanitizeDemoPlz } from "@/lib/plz";
import PlzForm from "@/components/plz-form";

export async function SiteHeader({
  plz,
  q,
  cuisine,
  km,
  chrome = "market",
}: {
  plz?: string | null;
  q?: string;
  cuisine?: string;
  km?: number | null;
  chrome?: "market" | "app";
} = {}) {
  const user = await getSession();
  const cookieStore = await cookies();
  const locale: Locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const hasStreet = Boolean(cookieStore.get(STREET_COOKIE)?.value?.trim());
  const activePlz = sanitizeDemoPlz(plz ?? cookieStore.get(PLZ_COOKIE)?.value, hasStreet);
  const activeKm =
    km !== undefined ? km : resolveUserRadius(null, cookieStore.get(RADIUS_COOKIE)?.value);
  const app = chrome === "app";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="lw-wrap flex h-14 items-center gap-1.5 sm:h-16 sm:gap-4">
        <Logo size="sm" className="shrink-0 sm:hidden" />
        <Logo size="md" className="hidden shrink-0 sm:inline-flex" />
        <PlzForm
          compact
          initialPlz={activePlz ?? ""}
          initialStreet={cookieStore.get(STREET_COOKIE)?.value ?? ""}
          initialCity={cookieStore.get(CITY_COOKIE)?.value ?? ""}
          q={q ?? ""}
          cuisine={cuisine ?? ""}
          km={activeKm}
        />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {app ? null : (
            <div className="hidden sm:block">
              <LocaleToggle />
            </div>
          )}
          {app ? null : <CartButton compact />}
          <AccountMenu user={user} locale={locale} iconOnly={app} localeInMenu={app ? "always" : "mobile"} />
        </div>
      </div>
    </header>
  );
}
