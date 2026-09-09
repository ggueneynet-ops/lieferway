import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";
import { serializeKitchenOrder } from "@/lib/restaurant-live";

export const dynamic = "force-dynamic";

export default async function RestaurantHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/restaurant");
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
          {q.ok === "radius" ? (
            <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">{t.radiusSaved}</p>
          ) : null}
          <p className="text-base text-ink">{t.noRestaurantYet}</p>
          <p className="text-sm text-muted-foreground">{t.partnerNoSignup}</p>
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
      {q.ok === "radius" ? (
        <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-base text-success">{t.radiusSaved}</p>
      ) : null}
      <details className="mb-4 rounded-xl border border-border bg-surface px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">{t.deliverySettings}</summary>
        <p className="mt-1 text-sm text-text-secondary">{t.maxDeliveryRadiusHint}</p>
        <form action="/restaurant/radius" method="post" className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={r.id} />
          <div>
            <label htmlFor="maxDeliveryKm" className="text-sm font-medium">
              {t.maxDeliveryRadius}
            </label>
            <input
              id="maxDeliveryKm"
              name="maxDeliveryKm"
              inputMode="decimal"
              placeholder={t.unlimitedRadius}
              defaultValue={r.maxDeliveryKm != null ? String(r.maxDeliveryKm) : ""}
              className="mt-1 h-11 w-32 rounded-lg border border-border bg-background px-3 text-base"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
          >
            {t.save}
          </button>
        </form>
        {r.maxDeliveryKm != null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {interpolate(t.withinRadius, { km: String(r.maxDeliveryKm) })}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t.unlimitedRadius}</p>
        )}
      </details>
      <RestaurantOrders
        initial={orders.map(serializeKitchenOrder)}
        isOpen={r.isOpen}
        restaurantId={r.id}
        restaurantName={r.name}
      />
    </PanelShell>
  );
}
