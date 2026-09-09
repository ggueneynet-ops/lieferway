import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { PLZ_COOKIE } from "@/lib/constants";
import { HomeSectionTitle } from "@/components/home-copy";
import { interpolate, cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { formatDistanceKm, normalizePlz } from "@/lib/plz";
import { CuisineRow } from "@/components/cuisine-row";
import { SplashIntro } from "@/components/splash-intro";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cuisine?: string; plz?: string }>;
}) {
  const { q, cuisine, plz: plzParam } = await searchParams;
  const { locale, t: copy } = await getCopy();
  const jar = await cookies();
  const plz = normalizePlz(plzParam) ?? normalizePlz(jar.get(PLZ_COOKIE)?.value);
  const filtered = await listMarketplaceRestaurants({ q, cuisine, plz });

  return (
    <>
      <SplashIntro />
      <SiteHeader plz={plz} q={q} cuisine={cuisine} showSearch />
      <main className="flex-1 bg-white">
        <div className="border-b border-border">
          <div className="mx-auto max-w-6xl">
            <CuisineRow locale={locale} plz={plz} q={q} cuisine={cuisine} allLabel={copy.all} />
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-4 pb-8 pt-4">
          <HomeSectionTitle
            kind="restaurants"
            count={filtered.length}
            plz={plz}
            nearby={Boolean(plz && filtered.some((r) => r.distanceKm != null))}
          />
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-bg-muted px-4 py-10 text-center">
              <p className="text-muted-foreground">
                {plz ? interpolate(copy.noDeliveryToPlz, { plz }) : copy.noResults}
              </p>
              {plz ? <p className="mt-2 text-sm text-muted-foreground">{copy.plzTryExamples}</p> : null}
            </div>
          ) : (
            <div className="divide-y divide-border sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 lg:grid-cols-2">
              {filtered.map((r) => (
                <div key={r.id} className="sm:border-b sm:border-border">
                  <RestaurantCard
                    r={r}
                    closedLabel={copy.closed}
                    cuisineLabel={cuisineName(locale, r.cuisine)}
                    distanceLabel={
                      r.distanceKm != null ? formatDistanceKm(r.distanceKm, locale) : undefined
                    }
                    districtLabel={r.district ?? undefined}
                    minLabel={copy.minOrder}
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
