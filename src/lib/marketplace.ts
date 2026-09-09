import { prisma } from "@/lib/prisma";
import { normalizePlz } from "@/lib/plz";
import {
  distanceFromOrigin,
  restaurantCoversDistance,
  type GeoOrigin,
} from "@/lib/radius";

export function marketplaceHref(opts: {
  plz?: string | null;
  q?: string;
  cuisine?: string;
  km?: number | null;
}) {
  const params = new URLSearchParams();
  if (opts.plz) params.set("plz", opts.plz);
  if (opts.q) params.set("q", opts.q);
  if (opts.cuisine) params.set("cuisine", opts.cuisine);
  if (opts.plz && opts.km !== undefined) {
    params.set("km", opts.km == null ? "all" : String(opts.km));
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export type MarketplaceRestaurant = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  description: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  etaMin: number;
  etaMax: number;
  isOpen: boolean;
  postalCode: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  maxDeliveryKm: number | null;
  distanceKm: number | null;
};

export async function listMarketplaceRestaurants(opts: {
  q?: string;
  cuisine?: string;
  plz?: string | null;
  km?: number | null;
  origin?: GeoOrigin | null;
}): Promise<MarketplaceRestaurant[]> {
  const plz = normalizePlz(opts.plz);
  const cuisine = opts.cuisine?.trim() ?? "";
  const query = (opts.q ?? "").trim().toLowerCase();
  const origin = opts.origin ?? null;
  const userKm = origin ? (opts.km ?? null) : null;

  const rows = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(cuisine ? { cuisine } : {}),
    },
    include: { serviceAreas: { select: { postalCode: true } } },
  });

  const mapped: MarketplaceRestaurant[] = [];
  for (const r of rows) {
    const distanceKm = distanceFromOrigin(origin, r.lat, r.lng);
    const servesPlz = plz ? r.serviceAreas.some((a) => a.postalCode === plz) : false;
    if (!restaurantCoversDistance(distanceKm, userKm, r.maxDeliveryKm, plz, servesPlz)) {
      continue;
    }
    mapped.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      cuisine: r.cuisine,
      description: r.description,
      imageUrl: r.imageUrl,
      rating: r.rating,
      reviewCount: r.reviewCount,
      deliveryFeeCents: r.deliveryFeeCents,
      minOrderCents: r.minOrderCents,
      etaMin: r.etaMin,
      etaMax: r.etaMax,
      isOpen: r.isOpen,
      postalCode: r.postalCode,
      district: r.district,
      lat: r.lat,
      lng: r.lng,
      maxDeliveryKm: r.maxDeliveryKm,
      distanceKm,
    });
  }

  const searched = query
    ? mapped.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.cuisine.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.postalCode.includes(query) ||
          (r.district ?? "").toLowerCase().includes(query),
      )
    : mapped;

  searched.sort((a, b) => {
    const da = a.distanceKm;
    const db = b.distanceKm;
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return a.name.localeCompare(b.name, "de");
  });

  return searched;
}
