import Link from "next/link";
import { Clock, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
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
      className="group block overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F7F8]">
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
        <div className="absolute left-2.5 top-2.5 flex max-w-[88%] flex-wrap gap-1">
          {popular && popularLabel ? (
            <span className="rounded-full bg-[#E91E63] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {popularLabel}
            </span>
          ) : null}
          {launchWeek && launchWeekLabel ? (
            <span className="rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-[#E91E63] shadow-sm ring-1 ring-[#E8E8EC]">
              {launchWeekLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-display text-[16px] font-semibold leading-snug tracking-tight text-[#0F172A]">
            {r.name}
          </h3>
          {hasReviews ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-[#0F172A]">
              <Star className="size-3.5 fill-[#E91E63] text-[#E91E63]" />
              {r.rating.toFixed(1)}
              <span className="font-medium text-[#94A3B8]">({r.reviewCount})</span>
            </span>
          ) : newLabel ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-[#FCE4EC] px-2 py-0.5 text-[11px] font-semibold text-[#E91E63]">
              {newLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[#64748B]">{cuisineLabel ?? r.cuisine}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#64748B]">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 text-[#E91E63]" strokeWidth={2} />
            {r.etaMin}–{r.etaMax} Min.
          </span>
          <span className="tabular-nums">
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className={`tabular-nums ${free || pickup ? "font-semibold text-[#E91E63]" : ""}`}>
            {feeText}
          </span>
        </div>
        {r.pickupAllowed && pickupLabel ? (
          <p className="mt-1.5 text-[11px] font-medium text-[#64748B]">{pickupLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
