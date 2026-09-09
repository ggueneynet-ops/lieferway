import { prisma } from "@/lib/prisma";
import { haversineKm, lookupPlz, normalizePlz } from "@/lib/plz";

export function marketplaceHref(opts: { plz?: string | null; q?: string; cuisine?: string }) {
  const params = new URLSearchParams();
  if (opts.plz) params.set("plz", opts.plz);
  if (opts.q) params.set("q", opts.q);
  if (opts.cuisine) params.set("cuisine", opts.cuisine);
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
  distanceKm: number | null;
};

export async function listMarketplaceRestaurants(opts: {
  q?: string;
  cuisine?: string;
  plz?: string | null;
}): Promise<MarketplaceRestaurant[]> {
  const plz = normalizePlz(opts.plz);
  const cuisine = opts.cuisine?.trim() ?? "";
  const query = (opts.q ?? "").trim().toLowerCase();
  const origin = plz ? lookupPlz(plz) : undefined;

  const rows = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(cuisine ? { cuisine } : {}),
      ...(plz ? { serviceAreas: { some: { postalCode: plz } } } : {}),
    },
  });

  const mapped: MarketplaceRestaurant[] = rows.map((r) => {
    const hasCoords = typeof r.lat === "number" && typeof r.lng === "number";
    const distanceKm =
      origin && hasCoords ? haversineKm(origin, { lat: r.lat!, lng: r.lng! }) : null;
    return {
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
      distanceKm,
    };
  });

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
