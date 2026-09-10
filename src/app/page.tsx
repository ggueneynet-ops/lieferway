import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { HomeSectionTitle, TrustStrip } from "@/components/home-copy";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { HeroSearch } from "@/components/hero-search";
import { RadiusChips } from "@/components/radius-chips";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cuisine?: string; plz?: string; km?: string }>;
}) {
  const { q, cuisine, plz: plzParam, km: kmParam } = await searchParams;
  const { locale, t: copy } = await getCopy();
  const jar = await cookies();
  const street = (jar.get(STREET_COOKIE)?.value ?? "").trim();
  const rawPlz = normalizePlz(plzParam) ?? normalizePlz(jar.get(PLZ_COOKIE)?.value);
  const gps = parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value);
  const plz = sanitizeDemoPlz(rawPlz, Boolean(street));
  const km = resolveUserRadius(kmParam, jar.get(RADIUS_COOKIE)?.value);
  const useGps = Boolean(street && gps && rawPlz === plz);
  const origin = resolveOrigin({
    plz,
    lat: useGps && gps ? gps.lat : null,
    lng: useGps && gps ? gps.lng : null,
  });
  const filtered = await listMarketplaceRestaurants({ q, cuisine, plz, km, origin });

  return (
    <>
      <SplashIntro />
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} />
      <main className="flex-1 bg-[#FAFAFA]">
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <p className="text-sm font-medium text-text-secondary">{copy.city}</p>
            <h1 className="mt-2 max-w-2xl font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-5xl">
              {copy.heroHeadline}
            </h1>
            <HeroSearch
              initialPlz={plz ?? ""}
              initialStreet={street}
              q={q}
              cuisine={cuisine}
              km={km}
            />
          </div>
        </section>
        <TrustStrip />

        <div className="mx-auto max-w-6xl px-4 py-6">
          {plz ? <RadiusChips plz={plz} q={q} cuisine={cuisine} km={km} /> : null}
          <div className="mt-5">
            <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} km={km} allLabel={copy.all} />
          </div>
        </div>

        <section id="restaurants" className="mx-auto max-w-6xl px-4 pb-16">
          <p className="mb-6 text-[13px] leading-relaxed text-text-secondary">{copy.demoMarketplaceNotice}</p>
          <HomeSectionTitle count={filtered.length} plz={plz} km={plz ? km : undefined} />
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-4 py-12 text-center">
              <p className="text-text-secondary">
                {plz && km != null
                  ? interpolate(copy.noDeliveryInRadius, { plz, km: String(km) })
                  : plz
                    ? interpolate(copy.noDeliveryToPlz, { plz })
                    : copy.noResults}
              </p>
              {plz ? <p className="mt-2 text-sm text-text-secondary">{copy.plzTryExamples}</p> : null}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RestaurantCard
                  key={r.id}
                  r={r}
                  closedLabel={copy.closed}
                  cuisineLabel={cuisineName(locale, r.cuisine)}
                  minLabel={copy.minOrder}
                  demoLabel={`${copy.demoBadge} / ${copy.demoExample}`}
                  feeLabel={copy.delivery}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
