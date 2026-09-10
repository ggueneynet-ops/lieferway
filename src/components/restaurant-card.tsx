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
      className="group block overflow-hidden rounded-2xl border border-border bg-white transition hover:-translate-y-0.5 hover:border-gray-300"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            {closedLabel}
          </div>
        )}
        {demoLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
            {demoLabel}
          </span>
        ) : null}
      </div>
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[17px] font-semibold tracking-tight text-ink">{r.name}</h3>
            <p className="mt-0.5 truncate text-[13px] text-text-secondary">{cuisineLabel ?? r.cuisine}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-ink">
            <Star className="size-3.5 fill-[#111827] text-[#111827]" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-text-secondary">
          <Clock className="size-3.5" />
          {r.etaMin}–{r.etaMax} Min.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] text-[#6B7280]">
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] text-[#6B7280]">
            {formatEUR(r.deliveryFeeCents)}
            {feeLabel ? ` ${feeLabel}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
