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
  distanceLabel,
  districtLabel,
  minLabel = "Min.",
}: {
  r: RestaurantCardData;
  closedLabel?: string;
  cuisineLabel?: string;
  distanceLabel?: string;
  districtLabel?: string;
  minLabel?: string;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);

  return (
    <Link href={`/restaurants/${r.slug}`} className="flex items-center gap-3 py-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-[72px] sm:w-[72px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="h-full w-full object-cover" />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-1 text-center text-[10px] font-medium text-white">
            {closedLabel}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">{r.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-ink">
            <Star className="size-3.5 fill-primary text-primary" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-text-secondary">
          {cuisineLabel ?? r.cuisine}
          {districtLabel ? ` · ${districtLabel}` : null}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {distanceLabel ? <span className="font-medium text-ink">{distanceLabel}</span> : null}
          <span className="inline-flex items-center gap-0.5">
            <Clock className="size-3" />
            {r.etaMin}–{r.etaMax} Min.
          </span>
          <span>
            {minLabel} {formatEUR(r.minOrderCents)}
          </span>
          <span>{formatEUR(r.deliveryFeeCents)}</span>
        </p>
      </div>
    </Link>
  );
}
