import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { DemoModeChip, HomeSectionTitle, TrustStrip } from "@/components/home-copy";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { HeroSearch } from "@/components/hero-search";
import { RadiusChips } from "@/components/radius-chips";
import { SPLASH_COOKIE } from "@/lib/splash";

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
  const splashDone = jar.get(SPLASH_COOKIE)?.value === "1";
  const useGps = Boolean(street && gps && rawPlz === plz);
  const origin = resolveOrigin({
    plz,
    lat: useGps && gps ? gps.lat : null,
    lng: useGps && gps ? gps.lng : null,
  });
  const filtered = await listMarketplaceRestaurants({ q, cuisine, plz, km, origin });

  return (
    <>
      {splashDone ? null : <SplashIntro />}
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} />
      <main className="flex-1 bg-[#FAFAFA]">
        <section className="lw-hero">
          <div className="lw-hero-wash" aria-hidden />
          <div className="lw-wrap relative py-14 sm:py-20">
            <p className="text-sm font-medium text-[#6B7280]">{copy.city}</p>
            <h1 className="mt-3 max-w-2xl font-display text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-[#111827] sm:text-5xl">
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

        <div className="lw-wrap pt-10 pb-4">
          {plz ? <RadiusChips plz={plz} q={q} cuisine={cuisine} km={km} /> : null}
          <div className="mt-8">
            <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} km={km} allLabel={copy.all} />
          </div>
        </div>

        <section id="restaurants" className="lw-wrap pt-8 pb-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <HomeSectionTitle count={filtered.length} plz={plz} km={plz ? km : undefined} />
            <DemoModeChip />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-[20px] border border-[#E5E7EB] bg-white px-4 py-12 text-center">
              <p className="text-[#6B7280]">
                {plz && km != null
                  ? interpolate(copy.noDeliveryInRadius, { plz, km: String(km) })
                  : plz
                    ? interpolate(copy.noDeliveryToPlz, { plz })
                    : copy.noResults}
              </p>
              {plz ? <p className="mt-2 text-sm text-[#6B7280]">{copy.plzTryExamples}</p> : null}
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
