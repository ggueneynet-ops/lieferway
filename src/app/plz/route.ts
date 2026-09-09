import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CITY_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, RADIUS_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { marketplaceHref } from "@/lib/marketplace";
import { normalizePlz, plzCookieOptions } from "@/lib/plz";
import { parseLatLng, parseUserRadius, radiusCookieOptions, radiusQueryValue, resolveUserRadius } from "@/lib/radius";

export async function POST(req: Request) {
  const form = await req.formData();
  const clear = String(form.get("clear") ?? "") === "1";
  const q = String(form.get("q") ?? "").trim();
  const cuisine = String(form.get("cuisine") ?? "").trim();
  const kmParsed = parseUserRadius(String(form.get("km") ?? ""));
  const plz = clear ? null : normalizePlz(String(form.get("plz") ?? ""));
  const coords = clear ? null : parseLatLng(String(form.get("lat") ?? ""), String(form.get("lng") ?? ""));
  const street = String(form.get("street") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const jar = await cookies();
  const cookieOpts = plzCookieOptions();

  if (kmParsed !== undefined) {
    jar.set(RADIUS_COOKIE, radiusQueryValue(kmParsed), radiusCookieOptions());
  }

  if (!plz) {
    jar.delete(PLZ_COOKIE);
    jar.delete(LAT_COOKIE);
    jar.delete(LNG_COOKIE);
    jar.delete(STREET_COOKIE);
    jar.delete(CITY_COOKIE);
    redirect(marketplaceHref({ q, cuisine }));
  }

  jar.set(PLZ_COOKIE, plz, cookieOpts);
  if (street) jar.set(STREET_COOKIE, street, cookieOpts);
  else jar.delete(STREET_COOKIE);
  if (city) jar.set(CITY_COOKIE, city, cookieOpts);
  else jar.delete(CITY_COOKIE);
  if (coords) {
    jar.set(LAT_COOKIE, String(coords.lat), cookieOpts);
    jar.set(LNG_COOKIE, String(coords.lng), cookieOpts);
  } else {
    jar.delete(LAT_COOKIE);
    jar.delete(LNG_COOKIE);
  }

  const km = resolveUserRadius(
    kmParsed === undefined ? null : radiusQueryValue(kmParsed),
    jar.get(RADIUS_COOKIE)?.value,
  );
  redirect(marketplaceHref({ plz, q, cuisine, km }));
}
