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

  return (
    <Link
      href={`/${r.slug}`}
      className="group block overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(17,24,39,0.09)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F3F4F6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
        />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            {closedLabel}
          </div>
        )}
        <div className="absolute left-2 top-2 flex max-w-[86%] flex-wrap gap-1">
          {popular && popularLabel ? (
            <span className="rounded-full bg-[#B72E57] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(183,46,87,0.35)]">
              {popularLabel}
            </span>
          ) : null}
          {isNew && newLabel ? (
            <span className="rounded-full bg-[#111827] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {newLabel}
            </span>
          ) : null}
          {selfDeliveryLabel ? (
            <span className="rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-[#922546] shadow-[0_2px_8px_rgba(17,24,39,0.12)] ring-1 ring-[#E8C5D0]">
              {selfDeliveryLabel}
            </span>
          ) : null}
          {launchWeek && launchWeekLabel ? (
            <span className="rounded-full bg-[#1A1A1A] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {launchWeekLabel}
            </span>
          ) : null}
        </div>
        <span className="absolute bottom-2 left-2 rounded-[11px] bg-white p-[2px] shadow-[0_2px_8px_rgba(17,24,39,0.14)]">
          <RestaurantLogo name={r.name} logoUrl={r.logoUrl} slug={r.slug} size={34} />
        </span>
      </div>
      <div className="px-3.5 pb-3.5 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-display text-[16px] font-semibold leading-snug tracking-tight text-[#111827]">
            {r.name}
          </h3>
          {hasReviews ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-[#111827]">
              <Star className="size-3.5 fill-[#B72E57] text-[#B72E57]" />
              {r.rating.toFixed(1)}
              <span className="font-medium text-[#9CA3AF]">({r.reviewCount})</span>
            </span>
          ) : newLabel ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-[#F7EBEF] px-2 py-0.5 text-[11px] font-semibold text-[#922546]">
              {newLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[#6B7280]">{cuisineLabel ?? r.cuisine}</p>
        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-[12px] bg-[#FAFAFA] px-2 py-1.5 text-center text-[11px] font-medium text-[#4B5563]">
          <span className="inline-flex items-center justify-center gap-1">
            <Clock className="size-3 text-[#B72E57]" strokeWidth={2} />
            {r.etaMin}–{r.etaMax} Min.
          </span>
          <span className="border-x border-[#EDEDED]">
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className={`truncate ${free || pickup ? "font-semibold text-[#922546]" : ""}`}>
            {pickup && pickupFeeLabel
              ? pickupFeeLabel
              : free && freeDeliveryLabel
                ? freeDeliveryLabel
                : `${formatEUR(r.deliveryFeeCents)}${feeLabel ? ` ${feeLabel}` : ""}`}
          </span>
        </div>
        {r.pickupAllowed && pickupLabel ? (
          <p className="mt-1.5 text-[11px] font-medium text-[#922546]">{pickupLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
