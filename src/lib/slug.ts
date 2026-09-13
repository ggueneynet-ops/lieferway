import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** First-path segments that must never become a restaurant slug. */
export const RESERVED_SLUGS = new Set([
  "about",
  "account",
  "admin",
  "api",
  "apply",
  "apple-icon.png",
  "cart",
  "checkout",
  "courier",
  "datenschutz",
  "favicon.ico",
  "google",
  "help",
  "hilfe",
  "icons",
  "impressum",
  "login",
  "logout",
  "media",
  "orders",
  "partner",
  "plz",
  "privacy",
  "radius",
  "register",
  "restaurant",
  "restaurants",
  "robots.txt",
  "sitemap.xml",
  "suchen",
  "ueber",
  "uploads",
  "warenkorb",
  "waypoints",
  "_next",
]);

export function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "restaurant";
}

export function parseSlugInput(raw: string) {
  const slug = slugifyName(raw);
  if (slug.length < 2 || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

async function slugTaken(slug: string, excludeId?: string) {
  if (RESERVED_SLUGS.has(slug)) return true;
  const found = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!found) return false;
  return found.id !== excludeId;
}

export async function assertUsableSlug(raw: string, excludeId?: string) {
  const slug = parseSlugInput(raw);
  if (!slug) return { ok: false as const, reason: "invalid" as const };
  if (await slugTaken(slug, excludeId)) return { ok: false as const, reason: "taken" as const };
  return { ok: true as const, slug };
}

/** kebab-case from the name; collisions get `-frankfurt`, then a short suffix. */
export async function uniqueRestaurantSlug(
  name: string,
  opts?: { city?: string; excludeId?: string; preferred?: string | null },
) {
  const fromName = slugifyName(name);
  const preferred = opts?.preferred ? parseSlugInput(opts.preferred) : null;
  const bases = [...new Set([preferred, fromName].filter((s): s is string => Boolean(s)))];

  for (const base of bases) {
    if (!(await slugTaken(base, opts?.excludeId))) return base;
    const withCity = `${base}-frankfurt`.slice(0, 60);
    if (!(await slugTaken(withCity, opts?.excludeId))) return withCity;
  }

  const fallback = bases[0] ?? "restaurant";
  for (let i = 0; i < 24; i++) {
    const candidate = `${fallback}-${randomBytes(2).toString("hex")}`;
    if (!(await slugTaken(candidate, opts?.excludeId))) return candidate;
  }
  return `${fallback}-${Date.now().toString(36)}`;
}

export function restaurantOrderPath(slug: string) {
  return `/${slug}`;
}

export function restaurantOrderUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, "")}/${slug}`;
}
