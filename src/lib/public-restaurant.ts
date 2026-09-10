import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS } from "@/lib/slug";

export async function loadPublicRestaurant(raw: string) {
  const slug = raw.trim().toLowerCase();
  if (!slug || RESERVED_SLUGS.has(slug)) return null;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) return null;
  return restaurant;
}
