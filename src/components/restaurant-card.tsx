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
  fulfillment?: FulfillmentType;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);
  const popular = r.reviewCount >= 700;
  const isNew = r.reviewCount < 350;
  const pickup = fulfillment === "PICKUP" && r.pickupAllowed !== false;
  const free = !pickup && r.deliveryFeeCents === 0;

  return (
    <Link
      href={`/${r.slug}`}
      className="group block overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(17,24,39,0.08)]"
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
        <div className="absolute left-2.5 top-2.5 flex max-w-[82%] flex-wrap gap-1.5">
          {popular && popularLabel ? (
            <span className="rounded-full bg-[#E91E63] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {popularLabel}
            </span>
          ) : null}
          {isNew && newLabel ? (
            <span className="rounded-full bg-[#111827] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {newLabel}
            </span>
          ) : null}
          {selfDeliveryLabel ? (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#C2185B] shadow-sm">
              {selfDeliveryLabel}
            </span>
          ) : null}
          {free && freeDeliveryLabel ? (
            <span className="rounded-full bg-[#111827]/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              {freeDeliveryLabel}
            </span>
          ) : null}
        </div>
        <span className="absolute bottom-2.5 left-2.5 rounded-[12px] bg-white p-[3px] shadow-[0_2px_8px_rgba(17,24,39,0.12)]">
          <RestaurantLogo name={r.name} logoUrl={r.logoUrl} slug={r.slug} size={36} />
        </span>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-[16px] font-semibold leading-snug tracking-tight text-[#111827]">
            {r.name}
          </h3>
          {isNew && newLabel && !popular ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-[#FCE4EC] px-2 py-0.5 text-[11px] font-semibold text-[#C2185B]">
              {newLabel}
            </span>
          ) : (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#111827]">
              <Star className="size-3.5 fill-[#111827] text-[#111827]" />
              {r.rating.toFixed(1)}
              <span className="font-medium text-[#9CA3AF]">({r.reviewCount})</span>
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[13px] text-[#6B7280]">
          {cuisineLabel ?? r.cuisine}
          <span className="text-[#D1D5DB]"> · </span>
          <span className="inline-flex items-baseline gap-1">
            <Clock className="relative top-px inline size-3" strokeWidth={1.75} />
            {r.etaMin}–{r.etaMax} Min.
          </span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6B7280]">
          <span>
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className="text-[#D1D5DB]">·</span>
          <span className={free || pickup ? "font-medium text-[#C2185B]" : ""}>
            {pickup && pickupFeeLabel
              ? pickupFeeLabel
              : free && freeDeliveryLabel
                ? freeDeliveryLabel
                : `${formatEUR(r.deliveryFeeCents)}${feeLabel ? ` ${feeLabel}` : ""}`}
          </span>
        </p>
        {r.pickupAllowed && pickupLabel ? (
          <p className="mt-2 text-[11px] font-medium text-[#C2185B]">{pickupLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
