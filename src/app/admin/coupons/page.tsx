import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminCoupons } from "@/components/admin-coupons";
import { getCopy } from "@/lib/get-locale";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    include: { restaurant: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
  const { t } = await getCopy();
  return (
    <PanelShell roles={["ADMIN"]} title={t.adminCoupons}>
      <p className="mb-4 text-sm text-muted-foreground">
        Nur Restaurant-Gutscheine. Lieferway erstellt keine Plattform-Codes. Admin kann auflisten und
        deaktivieren. Finanzierung: 100 % Restaurant · Provision auf Speisen nach Rabatt.
      </p>
      <AdminCoupons initial={JSON.parse(JSON.stringify(coupons))} />
    </PanelShell>
  );
}
