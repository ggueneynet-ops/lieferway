import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuClient } from "@/components/menu-client";
import { Bike, Clock, MapPin, ShoppingBag, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { getCopy } from "@/lib/get-locale";
import { cuisineName } from "@/lib/i18n";
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
  const photo = restaurantPhoto(restaurant.imageUrl, restaurant.cuisine, restaurant.slug);

  const facts = [
    {
      icon: Star,
      label: t.infoRating,
      value: `${restaurant.rating.toFixed(1)} (${restaurant.reviewCount})`,
    },
    {
      icon: Clock,
      label: t.infoEta,
      value: `${restaurant.etaMin}–${restaurant.etaMax} Min.`,
    },
    {
      icon: Bike,
      label: t.infoFee,
      value: formatEUR(restaurant.deliveryFeeCents, locale),
    },
    {
      icon: MapPin,
      label: t.infoDistance,
      value: distanceKm != null ? formatDistanceKm(distanceKm, locale) : "—",
    },
    {
      icon: ShoppingBag,
      label: t.infoMin,
      value: formatEUR(restaurant.minOrderCents, locale),
    },
  ];

  return (
    <>
      <SiteHeader plz={plz} km={km} />
      <main className="flex-1 bg-[#FAFAFA]">
        <div className="relative aspect-[16/7] min-h-[180px] max-h-[320px] overflow-hidden bg-[#F3F4F6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="lw-wrap py-6 sm:py-8">
          <p className="text-[13px] text-[#6B7280]">
            {cuisineName(locale, restaurant.cuisine)} · {restaurant.postalCode} {restaurant.city}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
              {restaurant.name}
            </h1>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] ring-1 ring-[#E5E7EB]">
              {t.demoBadge} / {t.demoExample}
            </span>
          </div>
          {!restaurant.isOpen && (
            <p className="mt-2 text-sm font-medium text-destructive">{t.closedNow}</p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-[#E5E7EB]">
            {facts.map((fact) => (
              <div key={fact.label} className="bg-white px-3 py-3.5 sm:px-4">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                  <fact.icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {fact.label}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-[#111827] sm:text-[15px]">{fact.value}</p>
              </div>
            ))}
            <div className="bg-white px-3 py-3.5 sm:px-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.delivery}</p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-[#111827] sm:text-[15px]">{t.restaurantDelivers}</p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
            {restaurant.address} · {restaurant.description}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
            {t.restaurantDeliversHint}
          </p>

          <div className="mt-8">
            <MenuClient restaurant={restaurant} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
