import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantCouponsPanel } from "@/components/restaurant-coupons-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantGutscheinePage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rgTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const coupons = await prisma.coupon.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });

  return (
    <RestaurantAppShell title={t.rgTitle} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantCouponsPanel initial={JSON.parse(JSON.stringify(coupons))} />
    </RestaurantAppShell>
  );
}
