import Link from "next/link";
import { Clock, MapPin, Star } from "lucide-react";
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
  demoLabel,
}: {
  r: RestaurantCardData;
  closedLabel?: string;
  cuisineLabel?: string;
  distanceLabel?: string;
  districtLabel?: string;
  minLabel?: string;
  demoLabel?: string;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);

  return (
    <Link
      href={`/restaurants/${r.slug}`}
      className="flex items-center gap-4 rounded-2xl px-1 py-4 transition-colors hover:bg-muted/60"
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm sm:h-20 sm:w-20">
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
          <div className="min-w-0">
            <h3 className="truncate font-display text-[16px] font-semibold leading-tight tracking-tight text-ink">
              {r.name}
            </h3>
            {demoLabel ? (
              <span className="mt-1 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {demoLabel}
              </span>
            ) : null}
          </div>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-ink">
            <Star className="size-3.5 fill-primary text-primary" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] text-text-secondary">
          {cuisineLabel ?? r.cuisine}
          {districtLabel ? ` · ${districtLabel}` : null}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 text-[12px] text-muted-foreground">
          {distanceLabel ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-ink">
              <MapPin className="size-3 text-primary" />
              {distanceLabel}
            </span>
          ) : null}
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
