import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RestaurantCard } from "@/components/restaurant-card";
import { CUISINES } from "@/lib/constants";
import { HomeSearch } from "@/components/home-search";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cuisine?: string }>;
}) {
  const { q, cuisine } = await searchParams;
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
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-16">
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
                Frankfurt am Main
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
                Essen bestellen.
                <span className="block text-primary">Dein Weg zum Tisch.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Döner aus Sachsenhausen, Pizza aus Bockenheim, Pho aus dem Nordend.
                Du zahlst an Lieferway – Restaurants erhalten montags Speisen minus 5&nbsp;% Provision.
              </p>
              <HomeSearch initialQ={q ?? ""} />
            </div>
            <div className="relative hidden md:block">
              <div className="grid grid-cols-2 gap-3">
                {restaurants.slice(0, 4).map((r) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={r.id}
                    src={r.imageUrl}
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
            <h2 className="text-lg font-semibold">Küchen</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Link
              href="/"
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!cuisine ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
            >
              Alle
            </Link>
            {CUISINES.map((c) => (
              <Link
                key={c}
                href={`/?cuisine=${encodeURIComponent(c)}`}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${cuisine === c ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-muted"}`}
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-4 text-lg font-semibold">
            {filtered.length} Restaurants in Frankfurt
          </h2>
          {filtered.length === 0 ? (
            <p className="rounded-2xl border bg-white p-8 text-center text-muted-foreground">
              Keine Restaurants gefunden. Anderen Suchbegriff versuchen.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RestaurantCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
