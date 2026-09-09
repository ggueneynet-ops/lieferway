import { json, options } from "@/lib/http";
import { listMarketplaceRestaurants } from "@/lib/marketplace";
import { parseLatLng, resolveOrigin, resolveUserRadius } from "@/lib/radius";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const cuisine = searchParams.get("cuisine") ?? "";
  const plz = searchParams.get("plz") ?? "";
  const km = resolveUserRadius(searchParams.get("km"), null);
  const gps = parseLatLng(searchParams.get("lat"), searchParams.get("lng"));
  const origin = resolveOrigin({ plz, lat: gps?.lat ?? null, lng: gps?.lng ?? null });
  const restaurants = await listMarketplaceRestaurants({ q, cuisine, plz, km, origin });
  return json({ restaurants });
}
