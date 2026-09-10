import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuClient } from "@/components/menu-client";
import { ReviewList } from "@/components/review-list";
import { Bike, Clock, MapPin, ShoppingBag, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";
import { getCopy } from "@/lib/get-locale";
import { cuisineName } from "@/lib/i18n";
import { LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE } from "@/lib/constants";
import { formatDistanceKm, normalizePlz } from "@/lib/plz";
import { distanceFromOrigin, parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";

export const dynamic = "force-dynamic";

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
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { customer: { select: { name: true } } },
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
      <main className="lw-page-enter flex-1 bg-[#FAFAFA]">
        <div className="h-[220px] w-full overflow-hidden bg-[#F3F4F6] sm:h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="lw-wrap py-6 sm:py-8">
          <p className="text-[13px] text-[#6B7280]">
            {cuisineName(locale, restaurant.cuisine)} · {restaurant.postalCode} {restaurant.city}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-[14px] bg-white p-[3px] shadow-[0_2px_8px_rgba(17,24,39,0.08)] ring-1 ring-[#E5E7EB]">
              <RestaurantLogo
                name={restaurant.name}
                logoUrl={restaurant.logoUrl}
                slug={restaurant.slug}
                size={56}
              />
            </span>
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

          <div className="mt-4 flex flex-wrap gap-1.5">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1 pl-2 pr-2.5"
              >
                <fact.icon className="size-3 shrink-0 text-[#9CA3AF]" strokeWidth={1.75} />
                <span className="text-[12px] font-semibold tabular-nums text-[#111827]">{fact.value}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{fact.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#FCE4EC] px-2.5 py-1 text-[11px] font-semibold text-[#C2185B]">
            <Bike className="size-3 shrink-0" strokeWidth={2} />
            {t.restaurantDelivers}
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
            {restaurant.address} · {restaurant.description}
          </p>

          <div className="mt-8">
            <h2 className="mb-3 font-display text-xl font-semibold text-[#111827]">{t.rpReviews}</h2>
            <ReviewList
              reviews={restaurant.reviews}
              locale={locale}
              empty={t.noReviewsYet}
              replyLabel={t.restaurantReply}
            />
          </div>

          <div className="mt-8">
            <MenuClient restaurant={restaurant} />
          </div>
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
