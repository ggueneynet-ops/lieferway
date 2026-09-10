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
import { HomeSectionTitle } from "@/components/home-copy";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { HeroSearch } from "@/components/hero-search";
import { HeroTrust } from "@/components/hero-trust";
import { LaunchWeekBanner } from "@/components/launch-week-banner";
import { RadiusChips } from "@/components/radius-chips";
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
  const rawPlz = normalizePlz(plzParam) ?? normalizePlz(jar.get(PLZ_COOKIE)?.value);
  const gps = parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value);
  const plz = sanitizeDemoPlz(rawPlz, Boolean(street));
  const km = resolveUserRadius(kmParam, jar.get(RADIUS_COOKIE)?.value);
  const splashDone = jar.get(SPLASH_COOKIE)?.value === "1";
  const fulfillment = parseFulfillment(jar.get(FULFILLMENT_COOKIE)?.value);
  const pickupOnly = fulfillment === "PICKUP";
  const useGps = Boolean(street && gps && rawPlz === plz);
  const origin = resolveOrigin({
    plz,
    lat: useGps && gps ? gps.lat : null,
    lng: useGps && gps ? gps.lng : null,
  });
  const nearby = await listMarketplaceRestaurants({ plz, km, origin, pickupOnly });
  const filtered = await listMarketplaceRestaurants({ q, cuisine, plz, km, origin, pickupOnly });
  const openCount = nearby.filter((r) => r.isOpen).length;
  const cardCopy = restaurantCardCopy(copy);

  return (
    <>
      {splashDone ? null : <SplashIntro />}
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} />
      <main className="flex-1 bg-[#FFF8F0]">
        <section className="lw-hero">
          <div className="lw-hero-wash" aria-hidden />
          <div className="lw-wrap relative py-4 sm:py-5">
            <h1 className="max-w-2xl text-balance font-display text-[1.55rem] font-semibold leading-[1.15] tracking-tight text-[#0F172A] sm:text-[1.85rem]">
              {copy.heroHeadline}
            </h1>
            <div className="mt-3 sm:hidden">
              <MarketFulfillmentSwitch initial={fulfillment} compact />
            </div>
            <div className="mt-3">
              <HeroSearch
                initialPlz={plz ?? ""}
                initialStreet={street}
                q={q}
                cuisine={cuisine}
                km={km}
              />
            </div>
            <HeroTrust
              openCount={openCount}
              openLabel={copy.heroTrustOpen}
              directLabel={copy.heroTrustDirect}
            />
          </div>
        </section>

        <section className="lw-wrap pb-3">
          <LaunchWeekBanner />
        </section>

        <section className="bg-[#FFF8F0]">
          <div className="lw-wrap pt-2 pb-4">
            {plz ? <RadiusChips plz={plz} q={q} cuisine={cuisine} km={km} /> : null}
            <div className={plz ? "mt-3" : ""}>
              <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} km={km} allLabel={copy.all} />
            </div>
          </div>
        </section>

        <section id="restaurants" className="lw-wrap pt-2 pb-20">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <HomeSectionTitle count={filtered.length} plz={plz} km={plz ? km : undefined} />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-[20px] border border-[#E8E2DC] bg-white px-4 py-12 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
      </main>
      <SiteFooter />
    </>
  );
}
