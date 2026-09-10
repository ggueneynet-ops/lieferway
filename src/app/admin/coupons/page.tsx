import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminCoupons } from "@/components/admin-coupons";
import { getCopy } from "@/lib/get-locale";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });
  const { t } = await getCopy();
  return (
    <PanelShell roles={["ADMIN"]} title={t.adminCoupons}>
      <p className="mb-4 text-sm text-muted-foreground">
        Prozent oder Festbetrag auf Speisen. Demo: WILLKOMMEN10, FRANKFURT, HOSGELDIN.
      </p>
      <AdminCoupons initial={JSON.parse(JSON.stringify(coupons))} />
    </PanelShell>
  );
}
