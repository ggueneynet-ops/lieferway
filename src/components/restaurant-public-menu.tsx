import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MenuClient } from "@/components/menu-client";
import { ReviewList } from "@/components/review-list";
import { RestaurantFulfillment } from "@/components/restaurant-fulfillment";
import { Bike, Clock, MapPin, ShoppingBag, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";
import { getCopy } from "@/lib/get-locale";
import { cuisineName } from "@/lib/i18n";
import { GEO_LIVE_COOKIE, GEO_SOURCE_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, isActiveDeliveryLocation } from "@/lib/constants";
import { formatDistanceKm, normalizePlz } from "@/lib/plz";
import { distanceFromOrigin, parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";
import { RestaurantPublicTabs } from "@/components/restaurant-public-tabs";
import { FavoriteButton } from "@/components/favorite-button";
import { isBannerLive, isOfferLive } from "@/lib/preorder";

export async function RestaurantPublicMenu({ slug }: { slug: string }) {
  const { t, locale } = await getCopy();
  const jar = await cookies();
  const trusted = isActiveDeliveryLocation(jar.get(GEO_SOURCE_COOKIE)?.value, jar.get(GEO_LIVE_COOKIE)?.value);
  const plz = trusted ? normalizePlz(jar.get(PLZ_COOKIE)?.value) : null;
  const km = resolveUserRadius(null, jar.get(RADIUS_COOKIE)?.value);
  const gps = trusted ? parseLatLng(jar.get(LAT_COOKIE)?.value, jar.get(LNG_COOKIE)?.value) : null;
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
      offers: {
        where: { isActive: true, funding: "RESTAURANT" },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!restaurant || !restaurant.isActive) notFound();
  const distanceKm = distanceFromOrigin(origin, restaurant.lat, restaurant.lng);
  const photo = restaurantPhoto(restaurant.imageUrl, restaurant.cuisine, restaurant.slug);
  const feeCents = listedDeliveryFeeCents(restaurant);

  const facts = [
    ...(restaurant.reviewCount > 0
      ? [
          {
            icon: Star,
            label: t.infoRating,
            value: `${restaurant.rating.toFixed(1)} (${restaurant.reviewCount})`,
          },
        ]
      : []),
    {
      icon: Clock,
      label: t.infoEta,
      value: `${restaurant.etaMin}–${restaurant.etaMax} Min.`,
    },
    {
      icon: Bike,
      label: t.infoFee,
      value: formatEUR(feeCents, locale),
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
      <main className="lw-page-enter flex-1 bg-white">
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
            <FavoriteButton restaurantId={restaurant.id} />
            {restaurant.wayPointsEnabled && !restaurant.wayPointsDisabledByAdmin ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#C2185B] shadow-sm ring-1 ring-[#F8BBD0]/80">
                ✦ {t.wpBadge}
              </span>
            ) : null}
            {restaurant.launchWeekFreeDelivery ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#E91E63] shadow-sm ring-1 ring-[#EEEFF2]">
                {t.launchWeekBadge}
              </span>
            ) : null}
            {restaurant.reviewCount === 0 ? (
              restaurant.launchWeekFreeDelivery ? (
                <span className="text-[10px] font-medium text-[#94A3B8]">{t.badgeNew}</span>
              ) : (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#0F172A] ring-1 ring-[#EEEFF2]">
                  {t.badgeNew}
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-[#111827] ring-1 ring-[#E5E7EB]">
                <Star className="size-3 fill-[#E91E63] text-[#E91E63]" />
                {restaurant.rating.toFixed(1)}
                <span className="font-medium text-[#9CA3AF]">({restaurant.reviewCount})</span>
              </span>
            )}
          </div>
          {restaurant.wayPointsEnabled && !restaurant.wayPointsDisabledByAdmin ? (
            <p className="mt-2 text-sm text-[#64748B]">{t.wpHere}</p>
          ) : null}
          {restaurant.launchWeekFreeDelivery ? (
            <p className="mt-2 text-sm text-[#64748B]">{t.launchWeekFreeHint}</p>
          ) : null}
          {!restaurant.isOpen && (
            <p className="mt-2 text-sm font-medium text-destructive">{t.closedNow}</p>
          )}

          {isBannerLive(restaurant) ? (
            <div className="mt-4 rounded-2xl border border-[#F8BBD0] bg-[#FFF7FA] px-4 py-3 text-sm text-[#C2185B]">
              <p className="font-semibold">{t.bannerPublicLabel}</p>
              <p className="mt-1 leading-relaxed text-[#9D174D]">{restaurant.bannerText}</p>
            </div>
          ) : null}
          {restaurant.offers.filter((o) => isOfferLive(o)).length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{t.offerPublicLabel}</p>
              <ul className="space-y-2">
                {restaurant.offers.filter((o) => isOfferLive(o)).map((o) => (
                  <li key={o.id} className="rounded-2xl border border-[#E8E8EC] bg-white px-4 py-3">
                    <p className="text-[15px] font-semibold text-[#0F172A]">{o.title}</p>
                    {o.description ? <p className="mt-0.5 text-sm text-[#64748B]">{o.description}</p> : null}
                    <p className="mt-1 text-xs font-medium text-[#C2185B]">
                      {o.type === "PERCENT"
                        ? `${o.discountPercent ?? 0} %`
                        : o.type === "FIXED"
                          ? formatEUR(o.discountCents ?? 0, locale)
                          : t.offerTypeInfo}
                      {o.minOrderCents ? ` · ${t.minOrder} ${formatEUR(o.minOrderCents, locale)}` : ""}
                      {` · ${o.scope === "PICKUP" ? t.fulfillmentPickup : o.scope === "DELIVERY" ? t.fulfillmentDelivery : t.rgScopeBoth}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
          <RestaurantFulfillment
            restaurantId={restaurant.id}
            pickupAllowed={restaurant.pickupAllowed !== false}
            address={restaurant.address}
            city={restaurant.city}
            postalCode={restaurant.postalCode}
            etaMin={restaurant.etaMin}
            deliveryFeeCents={feeCents}
            launchWeekFreeDelivery={Boolean(restaurant.launchWeekFreeDelivery)}
          />

          <RestaurantPublicTabs
            menu={<MenuClient restaurant={{ ...restaurant, deliveryFeeCents: feeCents }} />}
            reviews={
              <ReviewList
                reviews={restaurant.reviews}
                locale={locale}
                empty={t.noReviewsYet}
                replyLabel={t.restaurantReply}
              />
            }
            info={
              <div className="rounded-[20px] border border-[#E8E8EC] bg-white p-5">
                <p className="text-sm leading-relaxed text-[#64748B]">
                  {restaurant.address} · {restaurant.postalCode} {restaurant.city}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#0F172A]">{restaurant.description}</p>
              </div>
            }
          />
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
