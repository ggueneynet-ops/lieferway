import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { CUISINES } from "@/lib/constants";
import { HomeSearch } from "@/components/home-search";
import { AllLabel, HomeHeroCopy, HomeSectionTitle } from "@/components/home-copy";
import { restaurantPhoto } from "@/lib/media";
import { cuisineName } from "@/lib/i18n";
import { getCopy } from "@/lib/get-locale";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cuisine?: string }>;
}) {
  const { q, cuisine } = await searchParams;
  const { locale, t: copy } = await getCopy();
  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(cuisine ? { cuisine } : {}),
    },
    orderBy: { rating: "desc" },
  });
  const query = (q ?? "").trim().toLowerCase();
  const filtered = query
    ? restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.cuisine.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query),
      )
    : restaurants;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft to-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
            <div>
              <HomeHeroCopy />
              <HomeSearch initialQ={q ?? ""} />
              <div className="mt-6 flex gap-2 overflow-x-auto pb-1 md:hidden">
                {restaurants.slice(0, 6).map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={r.id}
                    src={restaurantPhoto(r.imageUrl, r.cuisine, r.slug)}
                    alt={r.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm"
                  />
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="grid grid-cols-2 gap-3">
                {restaurants.slice(0, 4).map((r) => (
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
              href="/"
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!cuisine ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
            >
              <AllLabel />
            </Link>
            {CUISINES.map((c) => (
              <Link
                key={c}
                href={`/?cuisine=${encodeURIComponent(c)}`}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${cuisine === c ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
              >
                {cuisineName(locale, c)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <HomeSectionTitle kind="restaurants" count={filtered.length} />
          {filtered.length === 0 ? (
            <HomeSectionTitle kind="empty" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => (
                <RestaurantCard
                  key={r.id}
                  r={r}
                  closedLabel={copy.closed}
                  cuisineLabel={cuisineName(locale, r.cuisine)}
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
