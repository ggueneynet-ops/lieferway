import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminRestaurants } from "@/components/admin-restaurants";

export default async function AdminRestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    include: { owner: { select: { email: true, name: true } }, _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <PanelShell roles={["ADMIN"]} title="Restaurants">
      <AdminRestaurants initial={JSON.parse(JSON.stringify(restaurants))} />
    </PanelShell>
  );
}
