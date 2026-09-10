import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { restaurantCardCopy, RestaurantCard } from "@/components/restaurant-card";
import {
  FULFILLMENT_COOKIE,
  LAT_COOKIE,
  LNG_COOKIE,
  PLZ_COOKIE,
  RADIUS_COOKIE,
  STREET_COOKIE,
} from "@/lib/constants";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { HomeSearch } from "@/components/home-search";
import { AddressFirst } from "@/components/address-first";
import { LaunchWeekBanner } from "@/components/launch-week-banner";
import { RadiusFilter } from "@/components/radius-filter";
import { MarketFulfillmentSwitch } from "@/components/market-fulfillment";
import { SPLASH_COOKIE } from "@/lib/splash";
import { parseFulfillment } from "@/lib/fulfillment";

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
  const chosenPlz = normalizePlz(plzParam) ?? normalizePlz(jar.get(PLZ_COOKIE)?.value);
  const hasAddress = Boolean(street || chosenPlz);
  const gps = parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value);
  const plz = hasAddress ? sanitizeDemoPlz(chosenPlz, Boolean(street)) : null;
  const km = resolveUserRadius(kmParam, jar.get(RADIUS_COOKIE)?.value);
  const splashDone = jar.get(SPLASH_COOKIE)?.value === "1";
  const fulfillment = parseFulfillment(jar.get(FULFILLMENT_COOKIE)?.value);
  const pickupOnly = fulfillment === "PICKUP";
  const useGps = Boolean(street && gps && chosenPlz === plz);
  const origin = resolveOrigin({
    plz,
    lat: useGps && gps ? gps.lat : null,
    lng: useGps && gps ? gps.lng : null,
  });
  const filtered = hasAddress
    ? await listMarketplaceRestaurants({ q, cuisine, plz, km, origin, pickupOnly })
    : [];
  const cardCopy = restaurantCardCopy(copy);

  return (
    <>
      {splashDone ? null : <SplashIntro />}
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} />
      <main className="flex-1 bg-[#FFF8F0]">
        <section className="lw-wrap pt-3 pb-2">
          <MarketFulfillmentSwitch initial={fulfillment} compact />
          {hasAddress ? (
            <div className="mt-3">
              <HomeSearch initialQ={q ?? ""} plz={plz} cuisine={cuisine} km={km} />
            </div>
          ) : null}
        </section>

        {hasAddress ? (
          <>
            <section className="lw-wrap pb-3">
              <LaunchWeekBanner />
            </section>
            <section className="lw-wrap pt-1 pb-3">
              <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} km={km} allLabel={copy.all} />
            </section>
            <section id="restaurants" className="lw-wrap pt-1 pb-20">
              <div className="mb-3 flex items-center justify-between gap-3">
                {plz ? <RadiusFilter plz={plz} q={q} cuisine={cuisine} km={km} /> : <span />}
                <p className="text-[12px] text-[#64748B]">
                  {filtered.length} {copy.restaurants}
                </p>
              </div>
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-[#E8E8EC] bg-white px-4 py-12 text-center">
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((r) => (
                    <RestaurantCard
                      key={r.id}
                      r={r}
                      cuisineLabel={cuisineName(locale, r.cuisine)}
                      fulfillment={fulfillment}
                      {...cardCopy}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="lw-wrap pb-20 pt-2">
            <AddressFirst q={q} cuisine={cuisine} km={km} />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
