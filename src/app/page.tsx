import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { CUISINES, PLZ_COOKIE } from "@/lib/constants";
import { HomeSearch } from "@/components/home-search";
import { AllLabel, HomeHeroCopy, HomeSectionTitle } from "@/components/home-copy";
import { restaurantPhoto } from "@/lib/media";
import { cuisineName, interpolate } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import { listMarketplaceRestaurants, marketplaceHref } from "@/lib/marketplace";
import { formatDistanceKm, normalizePlz } from "@/lib/plz";
import { PlzForm } from "@/components/plz-form";
import Link from "next/link";

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
      <SiteHeader plz={plz} />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft to-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
            <div>
              <HomeHeroCopy />
              <PlzForm initialPlz={plz ?? ""} q={q ?? ""} cuisine={cuisine ?? ""} />
              <HomeSearch initialQ={q ?? ""} plz={plz} cuisine={cuisine} />
              <div className="mt-6 flex gap-2 overflow-x-auto pb-1 md:hidden">
                {filtered.slice(0, 6).map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={r.id}
                    src={restaurantPhoto(r.imageUrl, r.cuisine, r.slug)}
                    alt={r.name}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-sm"
                  />
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="grid grid-cols-2 gap-3">
                {filtered.slice(0, 4).map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={r.id}
                    src={restaurantPhoto(r.imageUrl, r.cuisine, r.slug)}
                    alt={r.name}
                    className="h-36 w-full rounded-2xl object-cover shadow-sm last:translate-y-4 first:-translate-y-2"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <HomeSectionTitle kind="cuisines" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Link
              href={marketplaceHref({ plz, q })}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!cuisine ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
            >
              <AllLabel />
            </Link>
            {CUISINES.map((c) => (
              <Link
                key={c}
                href={marketplaceHref({ plz, q, cuisine: c })}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${cuisine === c ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
              >
                {cuisineName(locale, c)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <HomeSectionTitle
            kind="restaurants"
            count={filtered.length}
            plz={plz}
            nearby={Boolean(plz && filtered.some((r) => r.distanceKm != null))}
          />
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-muted-foreground">
                {plz ? interpolate(copy.noDeliveryToPlz, { plz }) : copy.noResults}
              </p>
              {plz ? <p className="mt-2 text-sm text-muted-foreground">{copy.plzTryExamples}</p> : null}
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filtered.map((r) => (
                <RestaurantCard
                  key={r.id}
                  r={r}
                  closedLabel={copy.closed}
                  cuisineLabel={cuisineName(locale, r.cuisine)}
                  distanceLabel={
                    r.distanceKm != null ? formatDistanceKm(r.distanceKm, locale) : undefined
                  }
                  districtLabel={r.district ?? undefined}
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
