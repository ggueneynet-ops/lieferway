import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PLZ_COOKIE } from "@/lib/constants";
import { normalizePlz, plzCookieOptions } from "@/lib/plz";

function homePath(q: string, cuisine: string, plz: string | null) {
  const params = new URLSearchParams();
  if (plz) params.set("plz", plz);
  if (q) params.set("q", q);
  if (cuisine) params.set("cuisine", cuisine);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const clear = String(form.get("clear") ?? "") === "1";
  const q = String(form.get("q") ?? "").trim();
  const cuisine = String(form.get("cuisine") ?? "").trim();
  const plz = clear ? null : normalizePlz(String(form.get("plz") ?? ""));
  const jar = await cookies();

  if (!plz) {
    jar.delete(PLZ_COOKIE);
    redirect(homePath(q, cuisine, null));
  }

  jar.set(PLZ_COOKIE, plz, plzCookieOptions());
  redirect(homePath(q, cuisine, plz));
}
