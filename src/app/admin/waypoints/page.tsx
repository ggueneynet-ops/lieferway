import { PanelShell } from "@/components/panel-shell";
import { AdminWayPoints } from "@/components/admin-waypoints";
import { getCopy } from "@/lib/get-locale";
import { adminWayPointsOverview } from "@/lib/waypoints-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminWayPointsPage() {
  const { t } = await getCopy();
  const [overview, allRestaurants] = await Promise.all([
    adminWayPointsOverview(),
    prisma.restaurant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, wayPointsEnabled: true, wayPointsDisabledByAdmin: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <PanelShell roles={["ADMIN"]} title={t.wpAdminTitle}>
      <p className="mb-4 text-sm text-muted-foreground">{t.wpAdminHint}</p>
      <AdminWayPoints
        initial={JSON.parse(JSON.stringify(overview))}
        restaurants={JSON.parse(JSON.stringify(allRestaurants))}
      />
    </PanelShell>
  );
}
