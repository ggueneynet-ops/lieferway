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
      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-[16/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={r.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {!r.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            {closedLabel}
          </div>
        )}
        <RestaurantLogo name={r.name} size={44} className="absolute bottom-3 left-3 ring-2 ring-white" />
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium shadow">
          {cuisineLabel ?? r.cuisine}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{r.name}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-ink">
            <Star className="size-3 fill-primary text-primary" />
            {r.rating.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
