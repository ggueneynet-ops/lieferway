import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { HomeSearch } from "@/components/home-search";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { cuisineName } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { locale, t } = await getCopy();
  const jar = await cookies();
  const street = (jar.get(STREET_COOKIE)?.value ?? "").trim();
  const plz = sanitizeDemoPlz(normalizePlz(jar.get(PLZ_COOKIE)?.value), Boolean(street));
  const km = resolveUserRadius(null, jar.get(RADIUS_COOKIE)?.value);
  const gps = parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value);
  const origin = resolveOrigin({
    plz,
    lat: street && gps ? gps.lat : null,
    lng: street && gps ? gps.lng : null,
  });
  const filtered = await listMarketplaceRestaurants({ q, plz, km, origin });

  return (
    <>
      <SiteHeader plz={plz} q={q} km={km} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.navSearch}</h1>
        <div className="mt-4">
          <HomeSearch initialQ={q ?? ""} plz={plz} km={km} action="/suchen" />
        </div>
        <p className="mt-6 text-sm text-text-secondary">
          {filtered.length} {t.restaurants}
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RestaurantCard
              key={r.id}
              r={r}
              closedLabel={t.closed}
              cuisineLabel={cuisineName(locale, r.cuisine)}
              minLabel={t.minOrder}
              demoLabel={`${t.demoBadge} / ${t.demoExample}`}
              feeLabel={t.delivery}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
