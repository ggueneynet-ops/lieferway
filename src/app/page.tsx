import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { HomeSectionTitle, TrustStrip } from "@/components/home-copy";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { formatDistanceKm, normalizePlz, sanitizeDemoPlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";

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
      <SiteHeader plz={plz} q={q} cuisine={cuisine} km={km} showSearch />
      <main className="flex-1 bg-white">
        <TrustStrip />
        <div className="border-b border-border">
          <div className="mx-auto max-w-6xl">
            <CuisineRow
              locale={locale}
              plz={plz}
              q={q}
              cuisine={cuisine}
              km={km}
              allLabel={copy.all}
            />
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-6">
          <p className="mb-4 rounded-2xl border border-primary/15 bg-primary-soft/50 px-4 py-3 text-[13px] leading-relaxed text-ink">
            {copy.demoMarketplaceNotice}
          </p>
          <HomeSectionTitle
            kind="restaurants"
            count={filtered.length}
            plz={plz}
            km={plz ? km : undefined}
            nearby={Boolean(plz && filtered.some((r) => r.distanceKm != null))}
          />
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-bg-muted px-4 py-10 text-center">
              <p className="text-muted-foreground">
                {plz && km != null
                  ? interpolate(copy.noDeliveryInRadius, { plz, km: String(km) })
                  : plz
                    ? interpolate(copy.noDeliveryToPlz, { plz })
                    : copy.noResults}
              </p>
              {plz ? <p className="mt-2 text-sm text-muted-foreground">{copy.plzTryExamples}</p> : null}
            </div>
          ) : (
            <div className="sm:grid sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-2">
              {filtered.map((r) => (
                <div key={r.id} className="border-b border-border/80">
                  <RestaurantCard
                    r={r}
                    closedLabel={copy.closed}
                    cuisineLabel={cuisineName(locale, r.cuisine)}
                    distanceLabel={
                      r.distanceKm != null ? formatDistanceKm(r.distanceKm, locale) : undefined
                    }
                    districtLabel={r.district ?? undefined}
                    minLabel={copy.minOrder}
                    demoLabel={`${copy.demoBadge} / ${copy.demoExample}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
