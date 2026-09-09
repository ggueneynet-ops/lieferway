import { json, options, fail } from "@/lib/http";
import { reverseGeocodeAddress } from "@/lib/geo";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail("lat and lng required", 400);
  }
  const found = await reverseGeocodeAddress(lat, lng);
  if (!found) return json({ plz: null, place: null });
  return json({
    plz: found.postalCode,
    city: found.city,
    street: found.street,
    lat: found.lat,
    lng: found.lng,
    source: "gps",
    place: found,
  });
}
