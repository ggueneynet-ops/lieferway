import Link from "next/link";
import { Clock, Star } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";

export type RestaurantCardData = {
  slug: string;
  name: string;
  cuisine: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  etaMin: number;
  etaMax: number;
  isOpen: boolean;
};

export function RestaurantCard({
  r,
  closedLabel = "Geschlossen",
  cuisineLabel,
  minLabel = "Min.",
  demoLabel,
  feeLabel,
}: {
  r: RestaurantCardData;
  closedLabel?: string;
  cuisineLabel?: string;
  minLabel?: string;
  demoLabel?: string;
  feeLabel?: string;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);

  return (
    <Link
      href={`/restaurants/${r.slug}`}
      className="group block overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.06)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#F3F4F6]">
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
        {demoLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
            {demoLabel}
          </span>
        ) : null}
      </div>
      <div className="px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[18px] font-semibold leading-snug tracking-tight text-[#111827]">
              {r.name}
            </h3>
            <p className="mt-1.5 truncate text-[13px] text-[#6B7280]">{cuisineLabel ?? r.cuisine}</p>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#111827]">
            <Star className="size-3.5 fill-[#111827] text-[#111827]" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[#6B7280]">
          <Clock className="size-3.5" strokeWidth={1.75} />
          {r.etaMin}–{r.etaMax} Min.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#E5E7EB] px-2.5 py-0.5 text-[11px] text-[#9CA3AF]">
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className="rounded-full border border-[#E5E7EB] px-2.5 py-0.5 text-[11px] text-[#9CA3AF]">
            {formatEUR(r.deliveryFeeCents)}
            {feeLabel ? ` ${feeLabel}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
