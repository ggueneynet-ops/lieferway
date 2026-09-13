import Link from "next/link";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { restaurantCardCopy, RestaurantCard } from "@/components/restaurant-card";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, GEO_LIVE_COOKIE, GEO_SOURCE_COOKIE, isActiveDeliveryLocation } from "@/lib/constants";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { normalizePlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { HomeSearch } from "@/components/home-search";
import { AddressFirst } from "@/components/address-first";
import { LaunchWeekBanner } from "@/components/launch-week-banner";
import { WayPointsBanner } from "@/components/waypoints-banner";
import { RadiusFilter } from "@/components/radius-filter";
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
  const source = jar.get(GEO_SOURCE_COOKIE)?.value;
  const trusted = isActiveDeliveryLocation(source, jar.get(GEO_LIVE_COOKIE)?.value);
  const cookiePlz = trusted ? normalizePlz(jar.get(PLZ_COOKIE)?.value) : null;
  const urlPlz = source === "manual" ? normalizePlz(plzParam) : null;
  const chosenPlz = urlPlz ?? cookiePlz;
  const hasAddress = Boolean(chosenPlz);
  const gps = trusted ? parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value) : null;
  const plz = chosenPlz;
  const km = resolveUserRadius(kmParam, jar.get(RADIUS_COOKIE)?.value);
  const splashDone = jar.get(SPLASH_COOKIE)?.value === "1";
  const origin = resolveOrigin({
    plz,
    lat: gps?.lat ?? null,
    lng: gps?.lng ?? null,
  });
  const filtered = hasAddress
    ? await listMarketplaceRestaurants({ q, cuisine, plz, km, origin })
    : [];
  const cardCopy = restaurantCardCopy(copy);

  return (
    <>
      {splashDone ? null : <SplashIntro />}
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} />
      <main className="flex-1 bg-[#FFFFFF]">
        {hasAddress ? (
          <div className="lw-wrap flex flex-col gap-5 pb-6 pt-3 sm:gap-6 sm:pt-4">
            <HomeSearch initialQ={q ?? ""} plz={plz} cuisine={cuisine} km={km} />

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-[17px] font-semibold tracking-tight text-[#0F172A]">
                  {copy.discoverTaste}
                </h2>
                <Link
                  href="/suchen"
                  className="shrink-0 text-[13px] font-medium text-[#0F172A] underline decoration-[#E91E63]/30 underline-offset-4"
                >
                  {copy.showAllLink}
                </Link>
              </div>
              <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} km={km} allLabel={copy.all} />
            </section>

            <WayPointsBanner
              title={copy.wpBannerTitle}
              subtitle={copy.wpBannerSub}
              cta={copy.wpBannerCta}
            />

            <LaunchWeekBanner />

            <section id="restaurants">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                {plz ? <RadiusFilter plz={plz} q={q} cuisine={cuisine} km={km} /> : <span />}
                <p className="text-[13px] font-medium text-[#64748B]">
                  {filtered.length} {copy.restaurants}
                </p>
              </div>
              {filtered.length === 0 ? (
                <div className="rounded-[1.35rem] border border-[#E8E8EC] bg-white px-4 py-12 text-center">
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
                <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((r) => (
                    <RestaurantCard
                      key={r.id}
                      r={r}
                      cuisineLabel={cuisineName(locale, r.cuisine)}
                      {...cardCopy}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="lw-wrap pb-8 pt-3">
            <AddressFirst q={q} cuisine={cuisine} km={km} />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
