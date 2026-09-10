import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantReviewsPanel } from "@/components/restaurant-reviews-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";

export const dynamic = "force-dynamic";

export default async function RestaurantReviewsPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpReviews}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  const reviews = await prisma.review.findMany({
    where: { restaurantId: restaurant.id },
    include: {
      customer: { select: { name: true } },
      order: { select: { shortCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <RestaurantAppShell title={t.rpReviews} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpReviews}</h1>
      <RestaurantReviewsPanel
        rating={restaurant.rating}
        count={restaurant.reviewCount}
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reply: r.reply,
          createdAt: r.createdAt.toISOString(),
          orderShortCode: r.order.shortCode,
          customer: r.customer,
        }))}
      />
    </RestaurantAppShell>
  );
}
