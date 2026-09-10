import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuClient } from "@/components/menu-client";
import { Bike, Clock, MapPin, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";
import { getCopy } from "@/lib/get-locale";
import { cuisineName, interpolate } from "@/lib/i18n";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE } from "@/lib/constants";
import { formatDistanceKm, normalizePlz } from "@/lib/plz";
import { distanceFromOrigin, parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t, locale } = await getCopy();
  const jar = await cookies();
  const plz = normalizePlz(jar.get(PLZ_COOKIE)?.value);
  const km = resolveUserRadius(null, jar.get(RADIUS_COOKIE)?.value);
  const gps = parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value);
  const origin = resolveOrigin({ plz, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!restaurant || !restaurant.isActive) notFound();
  const distanceKm = distanceFromOrigin(origin, restaurant.lat, restaurant.lng);

  return (
    <>
      <SiteHeader plz={plz} km={km} />
      <main className="flex-1">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:py-4">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-muted sm:h-[88px] sm:w-[88px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={restaurantPhoto(restaurant.imageUrl, restaurant.cuisine, restaurant.slug)}
                alt=""
                className="h-full w-full object-cover"
              />
              <RestaurantLogo name={restaurant.name} size={20} className="absolute bottom-1 left-1 ring-1 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-secondary">
                {cuisineName(locale, restaurant.cuisine)} · {restaurant.postalCode} {restaurant.city}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                  {restaurant.name}
                </h1>
                <span className="inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {t.demoBadge} / {t.demoExample}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:text-xs">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3 fill-primary text-primary" />
                  {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {restaurant.etaMin}–{restaurant.etaMax} Min.
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bike className="size-3" />
                  {formatEUR(restaurant.deliveryFeeCents, locale)} {t.delivery}
                </span>
                {distanceKm != null ? (
                  <span className="inline-flex items-center gap-1 font-medium text-ink">
                    <MapPin className="size-3 text-primary" />
                    {formatDistanceKm(distanceKm, locale)}
                  </span>
                ) : null}
                {restaurant.maxDeliveryKm != null ? (
                  <span>{interpolate(t.withinRadius, { km: String(restaurant.maxDeliveryKm) })}</span>
                ) : null}
                <span>{t.minOrder} {formatEUR(restaurant.minOrderCents, locale)}</span>
              </div>
              {!restaurant.isOpen && (
                <p className="mt-1 text-xs font-medium text-destructive">{t.closedNow}</p>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-5">
          <p className="mb-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {restaurant.address} · {restaurant.description}
          </p>
          <p className="mb-6 max-w-2xl rounded-2xl border border-primary/15 bg-primary-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">
            {t.restaurantDelivers} {t.restaurantDeliversHint}
          </p>
          <MenuClient restaurant={restaurant} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
