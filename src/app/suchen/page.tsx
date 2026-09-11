import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { restaurantCardCopy, RestaurantCard } from "@/components/restaurant-card";
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
  const cardCopy = restaurantCardCopy(t);

  return (
    <>
      <SiteHeader plz={plz} q={q} km={km} />
      <main className="lw-wrap flex-1 pb-6 pt-3">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-[#0F172A]">{t.navSearch}</h1>
        <div className="mt-3">
          <HomeSearch initialQ={q ?? ""} plz={plz} km={km} action="/suchen" />
        </div>
        <p className="mt-5 text-[13px] font-medium text-[#64748B]">
          {filtered.length} {t.restaurants}
        </p>
        <div className="mt-3.5 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RestaurantCard
              key={r.id}
              r={r}
              cuisineLabel={cuisineName(locale, r.cuisine)}
              {...cardCopy}
            />
          ))}
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
