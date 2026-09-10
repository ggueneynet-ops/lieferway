import { prisma } from "@/lib/prisma";

export async function refreshRestaurantRating(restaurantId: string) {
  const agg = await prisma.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = agg._count._all;
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
