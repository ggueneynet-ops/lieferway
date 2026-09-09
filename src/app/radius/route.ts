import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RADIUS_COOKIE } from "@/lib/constants";
import { marketplaceHref } from "@/lib/marketplace";
import { normalizePlz } from "@/lib/plz";
import { parseUserRadius, radiusCookieOptions, radiusQueryValue, resolveUserRadius } from "@/lib/radius";

export async function POST(req: Request) {
  const form = await req.formData();
  const q = String(form.get("q") ?? "").trim();
  const cuisine = String(form.get("cuisine") ?? "").trim();
  const plz = normalizePlz(String(form.get("plz") ?? ""));
  const parsed = parseUserRadius(String(form.get("km") ?? "all"));
  const km = parsed === undefined ? resolveUserRadius(null, null) : parsed;
  const jar = await cookies();
  jar.set(RADIUS_COOKIE, radiusQueryValue(km), radiusCookieOptions());
  redirect(marketplaceHref({ plz, q, cuisine, km }));
}
