import Link from "next/link";
import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { formatBerlinDateTime } from "@/lib/datetime";
import { addDaysYmd, berlinYmd, startOfBerlinDay } from "@/lib/restaurant-reports";
import { PrintBonButton } from "@/components/print-bon-button";

export const dynamic = "force-dynamic";

function parseDateParam(value?: string) {
  if (value === "all") return "all" as const;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return berlinYmd();
}

export default async function RestaurantOrdersHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t, locale } = await getCopy();
  const q = await searchParams;
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.ordersCount}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  const today = berlinYmd();
  const yesterday = addDaysYmd(today, -1);
  const selected = parseDateParam(q.date);
  const range =
    selected === "all"
      ? null
      : {
          gte: startOfBerlinDay(selected),
          lt: startOfBerlinDay(addDaysYmd(selected, 1)),
        };

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      ...(range ? { createdAt: range } : {}),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { select: { name: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const chips = [
    { href: `/restaurant/orders?date=${today}`, id: today, label: t.periodToday },
    { href: `/restaurant/orders?date=${yesterday}`, id: yesterday, label: t.periodYesterday },
    { href: "/restaurant/orders?date=all", id: "all", label: t.periodAll },
  ];

  return (
    <RestaurantAppShell title={t.ordersCount} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.ordersCount}</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className={`h-10 rounded-full px-3 text-sm font-medium leading-10 ${
              selected === c.id ? "bg-primary text-white" : "border border-[#E5E7EB] bg-white text-[#111827]"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex gap-2" action="/restaurant/orders" method="get">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {t.periodFrom}
          <input
            type="date"
            name="date"
            defaultValue={selected === "all" ? today : selected}
            className="h-12 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3"
          />
        </label>
        <button type="submit" className="h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          {t.periodApply}
        </button>
      </form>
      {orders.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6B7280]">{t.noOrdersInPeriod}</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{o.shortCode}</p>
                <StatusBadge status={o.status} locale={locale} />
              </div>
              <p className="mt-1 text-sm text-[#6B7280]">
                {formatBerlinDateTime(o.createdAt, locale)} · {o.customer.name}
              </p>
              <p className="mt-1 text-sm font-medium">{formatEUR(o.foodSubtotalCents, locale)}</p>
              <div className="mt-3">
                <PrintBonButton
                  order={{
                    shortCode: o.shortCode,
                    restaurantName: restaurant.name,
                    createdAt: o.createdAt.toISOString(),
                    paymentMethod: o.paymentMethod,
                    totalCents: o.totalCents,
                    foodSubtotalCents: o.foodSubtotalCents,
                    notes: o.notes,
                    street: o.street,
                    postalCode: o.postalCode,
                    city: o.city,
                    items: o.items,
                    customer: o.customer,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </RestaurantAppShell>
  );
}
