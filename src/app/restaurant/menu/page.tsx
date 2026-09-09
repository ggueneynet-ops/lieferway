import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MenuEditor } from "@/components/menu-editor";
import { getCopy } from "@/lib/get-locale";

export default async function RestaurantMenuPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/restaurant");
  const { t } = await getCopy();
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: session.id },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { name: "asc" } } } },
    },
  });
  if (!restaurant) {
    return (
      <PanelShell roles={["RESTAURANT"]} title={t.menuTitle}>
        <p>Kein Restaurant verknüpft. Demo: restaurant@lieferway.de</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell roles={["RESTAURANT"]} title={`${t.menuTitle} · ${restaurant.name}`}>
      <MenuEditor
        restaurantId={restaurant.id}
        categories={JSON.parse(JSON.stringify(restaurant.categories))}
        cuisine={restaurant.cuisine}
      />
    </PanelShell>
  );
}
