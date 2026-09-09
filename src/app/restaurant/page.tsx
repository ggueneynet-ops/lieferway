import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RestaurantOrders } from "@/components/restaurant-orders";

export default async function RestaurantHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: session.id },
  });
  if (!restaurant && session.role !== "ADMIN") {
    return (
      <PanelShell roles={["RESTAURANT"]} title="Restaurant">
        <p>Kein Restaurant mit diesem Konto verknüpft.</p>
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
