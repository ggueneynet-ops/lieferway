import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { CUISINES } from "@/lib/constants";
import { getCopy } from "@/lib/get-locale";

export const dynamic = "force-dynamic";

export default async function RestaurantHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { t } = await getCopy();
  const q = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: session.id },
  });
  if (!restaurant && session.role !== "ADMIN") {
    return (
      <PanelShell roles={["RESTAURANT"]} title={t.restaurantPanel}>
        <div className="mx-auto max-w-xl space-y-4">
          {q.error ? (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-base text-danger">{q.error}</p>
          ) : null}
          <p className="text-base text-ink">{t.noRestaurantYet}</p>
          <form action="/restaurant/create" method="post" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <div>
              <label htmlFor="name" className="text-base font-medium">
                {t.name}
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder="z. B. Café Main"
              />
            </div>
            <div>
              <label htmlFor="cuisine" className="text-base font-medium">
                {t.cuisine}
              </label>
              <select
                id="cuisine"
                name="cuisine"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                defaultValue={CUISINES[0]}
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="h-14 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed">
              {t.createRestaurant}
            </button>
          </form>
        </div>
      </PanelShell>
    );
  }
  const restaurantId =
    restaurant?.id ??
    (await prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } }))?.id;
  if (!restaurantId) redirect("/");

  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: { items: true, customer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const r = restaurant ?? (await prisma.restaurant.findUnique({ where: { id: restaurantId } }))!;

  return (
    <PanelShell roles={["RESTAURANT"]} title={`${r.name} · ${t.restaurantOrders}`}>
      <RestaurantOrders
        initial={JSON.parse(JSON.stringify(orders))}
        isOpen={r.isOpen}
      />
    </PanelShell>
  );
}
