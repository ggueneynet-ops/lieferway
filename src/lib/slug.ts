import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** First-path segments that must never become a restaurant slug. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "account",
  "api",
  "cart",
  "checkout",
  "courier",
  "datenschutz",
  "hilfe",
  "impressum",
  "login",
  "media",
  "orders",
  "partner",
  "register",
  "restaurant",
  "restaurants",
  "robots.txt",
  "suchen",
  "ueber",
  "favicon.ico",
  "sitemap.xml",
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

/** kebab-case from the name; collisions get `-frankfurt`, then a short suffix. */
export async function uniqueRestaurantSlug(
  name: string,
  opts?: { city?: string; excludeId?: string },
) {
  const base = slugifyName(name);
  if (!(await slugTaken(base, opts?.excludeId))) return base;

  const withCity = `${base}-frankfurt`.slice(0, 60);
  if (!(await slugTaken(withCity, opts?.excludeId))) return withCity;

  for (let i = 0; i < 24; i++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (!(await slugTaken(candidate, opts?.excludeId))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function restaurantOrderPath(slug: string) {
  return `/${slug}`;
}

export function restaurantOrderUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, "")}/${slug}`;
}
