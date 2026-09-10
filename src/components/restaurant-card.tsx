import Link from "next/link";
import { Clock, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";
import type { FulfillmentType } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";

export type RestaurantCardData = {
  slug: string;
  name: string;
  cuisine: string;
  imageUrl: string;
  logoUrl?: string | null;
  rating: number;
  reviewCount: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  etaMin: number;
  etaMax: number;
  isOpen: boolean;
  pickupAllowed?: boolean;
  launchWeekFreeDelivery?: boolean;
};

export function restaurantCardCopy(t: Dictionary) {
  return {
    closedLabel: t.closed,
    minLabel: t.minOrder,
    feeLabel: t.delivery,
    popularLabel: t.badgePopular,
    selfDeliveryLabel: t.badgeSelfDelivery,
    freeDeliveryLabel: t.badgeFreeDelivery,
    newLabel: t.badgeNew,
    pickupLabel: t.restaurantOffersPickup,
    pickupFeeLabel: t.pickupFeeNone,
    launchWeekLabel: t.launchWeekBadge,
  };
}

export function RestaurantCard({
  r,
  closedLabel = "Geschlossen",
  cuisineLabel,
  minLabel = "Min.",
  feeLabel,
  popularLabel,
  selfDeliveryLabel,
  freeDeliveryLabel,
  newLabel,
  pickupLabel,
  pickupFeeLabel,
  launchWeekLabel,
  fulfillment = "DELIVERY",
}: {
  r: RestaurantCardData;
  closedLabel?: string;
  cuisineLabel?: string;
  minLabel?: string;
  feeLabel?: string;
  popularLabel?: string;
  selfDeliveryLabel?: string;
  freeDeliveryLabel?: string;
  newLabel?: string;
  pickupLabel?: string;
  pickupFeeLabel?: string;
  launchWeekLabel?: string;
  fulfillment?: FulfillmentType;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);
  const hasReviews = r.reviewCount > 0;
  const popular = r.reviewCount >= 10;
  const isNew = !hasReviews;
  const pickup = fulfillment === "PICKUP" && r.pickupAllowed !== false;
  const launchWeek = Boolean(r.launchWeekFreeDelivery);
  const free = !pickup && (r.deliveryFeeCents === 0 || launchWeek);
  const feeText =
    pickup && pickupFeeLabel
      ? pickupFeeLabel
      : free && freeDeliveryLabel
        ? freeDeliveryLabel
        : `${formatEUR(r.deliveryFeeCents)}${feeLabel ? ` ${feeLabel}` : ""}`;

  return (
    <Link
      href={`/${r.slug}`}
      className="group flex gap-3 rounded-[18px] border border-[#E8E8EC] bg-white p-2.5 shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:block sm:overflow-hidden sm:p-0"
    >
      <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-[14px] bg-[#F7F7F8] sm:aspect-[16/10] sm:h-auto sm:w-auto sm:rounded-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
        />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-medium text-white sm:text-sm">
            {closedLabel}
          </div>
        )}
        <div className="absolute left-1.5 top-1.5 hidden max-w-[86%] flex-wrap gap-1 sm:flex">
          {popular && popularLabel ? (
            <span className="rounded-full bg-[#E91E63] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {popularLabel}
            </span>
          ) : null}
          {isNew && newLabel ? (
            <span className="rounded-full bg-[#0F172A] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {newLabel}
            </span>
          ) : null}
          {selfDeliveryLabel ? (
            <span className="rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-[#C2185B] shadow-sm ring-1 ring-[#E8E8EC]">
              {selfDeliveryLabel}
            </span>
          ) : null}
        </div>
        <span className="absolute bottom-1.5 left-1.5 hidden rounded-[11px] bg-white p-[2px] shadow-sm sm:block">
          <RestaurantLogo name={r.name} logoUrl={r.logoUrl} slug={r.slug} size={34} />
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5 sm:px-3.5 sm:pb-3.5 sm:pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold leading-snug tracking-tight text-[#0F172A] sm:text-[16px]">
            {r.name}
          </h3>
          {hasReviews ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-[#0F172A]">
              <Star className="size-3.5 fill-[#E91E63] text-[#E91E63]" />
              {r.rating.toFixed(1)}
              <span className="font-medium text-[#94A3B8]">({r.reviewCount})</span>
            </span>
          ) : newLabel ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-[#FFF5F8] px-2 py-0.5 text-[11px] font-semibold text-[#C2185B]">
              {newLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[#64748B]">{cuisineLabel ?? r.cuisine}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#64748B] sm:mt-2.5 sm:grid sm:grid-cols-3 sm:gap-1 sm:rounded-[12px] sm:bg-[#F7F7F8] sm:px-2 sm:py-1.5 sm:text-center sm:text-[11px] sm:font-medium">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 text-[#E91E63]" strokeWidth={2} />
            {r.etaMin}–{r.etaMax} Min.
          </span>
          <span className="hidden sm:inline">
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className={`tabular-nums ${free || pickup ? "font-semibold text-[#C2185B]" : ""}`}>
            {feeText}
          </span>
        </div>
        {r.pickupAllowed && pickupLabel ? (
          <p className="mt-1 hidden text-[11px] font-medium text-[#C2185B] sm:block">{pickupLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
