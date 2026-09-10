import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { dateLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function RestaurantOrdersHistoryPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t, locale } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.ordersCount}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const fmt = new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });

  return (
    <RestaurantAppShell title={t.ordersCount} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.ordersCount}</h1>
      {orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6B7280]">{t.noOrders}</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{o.shortCode}</p>
                <StatusBadge status={o.status} locale={locale} />
              </div>
              <p className="mt-1 text-sm text-[#6B7280]">
                {fmt.format(o.createdAt)} · {o.customer.name}
              </p>
              <p className="mt-1 text-sm font-medium">{formatEUR(o.foodSubtotalCents, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </RestaurantAppShell>
  );
}
