import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { CUISINES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function RestaurantHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const q = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: session.id },
  });
  if (!restaurant && session.role !== "ADMIN") {
    return (
      <PanelShell roles={["RESTAURANT"]} title="Restaurant">
        <div className="mx-auto max-w-xl space-y-4">
          {q.error ? (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-base text-danger">{q.error}</p>
          ) : null}
          <p className="text-base text-ink">Noch kein Restaurant mit diesem Konto. Kurz anlegen:</p>
          <form action="/restaurant/create" method="post" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <div>
              <label htmlFor="name" className="text-base font-medium">
                Name
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
                Küche
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
              Restaurant anlegen
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
    <PanelShell roles={["RESTAURANT"]} title={`${r.name} · Bestellungen`}>
      <RestaurantOrders
        initial={JSON.parse(JSON.stringify(orders))}
        isOpen={r.isOpen}
      />
    </PanelShell>
  );
}
