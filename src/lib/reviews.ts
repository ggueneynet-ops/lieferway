import { prisma } from "@/lib/prisma";

export async function refreshRestaurantRating(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { rating: true, reviewCount: true },
  });
  const agg = await prisma.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = agg._count._all;
  // Keep seeded marketplace social proof when only a handful of in-app reviews exist.
  if (restaurant && reviewCount < 20 && restaurant.reviewCount >= 100) return;
  const rating = reviewCount === 0 ? 0 : Math.round((agg._avg.rating ?? 0) * 10) / 10;
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { rating, reviewCount },
  });
}

export function guestFirstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || "Gast";
}
