import Link from "next/link";
import { Clock, Star, Bike } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";

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
}: {
  r: RestaurantCardData;
  closedLabel?: string;
  cuisineLabel?: string;
}) {
  const photo = restaurantPhoto(r.imageUrl, r.cuisine, r.slug);

  return (
    <Link
      href={`/restaurants/${r.slug}`}
      className="group flex items-stretch gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-2.5 shadow-sm transition hover:shadow-md sm:gap-3.5 sm:p-3"
    >
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={r.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-1 text-center text-[10px] font-medium text-white">
            {closedLabel}
          </div>
        )}
        <RestaurantLogo
          name={r.name}
          size={22}
          className="absolute bottom-1 left-1 ring-1 ring-white"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{r.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-ink">
            <Star className="size-3 fill-primary text-primary" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">{cuisineLabel ?? r.cuisine}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {r.etaMin}–{r.etaMax} Min.
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike className="size-3" />
            {formatEUR(r.deliveryFeeCents)}
          </span>
          <span>Min. {formatEUR(r.minOrderCents)}</span>
        </div>
      </div>
    </Link>
  );
}
