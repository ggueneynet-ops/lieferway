import Link from "next/link";
import { Star } from "lucide-react";
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
        : `${formatEUR(r.deliveryFeeCents)} ${feeLabel ?? ""}`.trim();
  const etaText = `${r.etaMin}–${r.etaMax} Min.`;
  const minText = `${minLabel} ${formatEUR(r.minOrderCents)}`;
  const showNew = Boolean(!hasReviews && newLabel);

  return (
    <Link
      href={`/${r.slug}`}
      className="group block w-full min-w-0 overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-[#EEEFF2] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.1)]"
    >
      <div className="lw-card-photo shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          width={800}
          height={600}
          className="transition duration-500 group-hover:scale-[1.03]"
        />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            {closedLabel}
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex max-w-[88%] flex-wrap items-center gap-1">
          {launchWeek && launchWeekLabel ? (
            <span className="rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-[#E91E63] shadow-sm">
              {launchWeekLabel}
            </span>
          ) : null}
          {showNew ? (
            <span
              className={`rounded-full bg-white/90 px-1.5 py-[2px] font-medium text-[#64748B] shadow-sm ${
                launchWeek ? "text-[9px]" : "px-2 py-[3px] text-[10px] font-semibold text-[#0F172A]"
              }`}
            >
              {newLabel}
            </span>
          ) : null}
          {popular && popularLabel ? (
            <span className="rounded-full bg-[#E91E63] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-white">
              {popularLabel}
            </span>
          ) : null}
        </div>
        <span className="absolute bottom-2.5 left-2.5 rounded-[11px] bg-white p-[3px] shadow-[0_6px_16px_rgba(15,23,42,0.18)]">
          <RestaurantLogo name={r.name} logoUrl={r.logoUrl} slug={r.slug} size={36} />
        </span>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <h3 className="truncate font-display text-[17px] font-bold leading-snug tracking-tight text-[#0F172A]">
          {r.name}
        </h3>
        {cuisineLabel ? <p className="sr-only">{cuisineLabel}</p> : null}
        <div className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-[#64748B]">
          <p className="flex flex-wrap items-center gap-x-1.5">
            {hasReviews ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 shrink-0 fill-[#E91E63] text-[#E91E63]" />
                <span>
                  {r.rating.toFixed(1)} ({r.reviewCount})
                </span>
              </span>
            ) : null}
            {hasReviews ? <span className="text-[#D1D5DB]">·</span> : null}
            <span className={free ? "font-medium text-[#0F172A]" : ""}>{feeText}</span>
            <span className="text-[#D1D5DB]">·</span>
            <span>{etaText}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
            <span>{minText}</span>
            {r.pickupAllowed && pickupLabel ? (
              <>
                <span className="text-[#D1D5DB]">·</span>
                <span>{pickupLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </Link>
  );
}
