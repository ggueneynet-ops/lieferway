import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/money";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";
import Link from "next/link";
import { getCopy } from "@/lib/get-locale";

export default async function AdminHome() {
  const { t, locale } = await getCopy();
  const [restaurants, orders, delivered] = await Promise.all([
    prisma.restaurant.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { commissionCents: true },
    }),
  ]);

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminPanel}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">{t.restaurants}</p>
            <p className="mt-1 text-3xl font-semibold">{restaurants}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">{t.orders}</p>
            <p className="mt-1 text-3xl font-semibold">{orders}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">
              {t.commission.replace(" %", "")} ({DEFAULT_COMMISSION_PERCENT} %)
            </p>
            <p className="mt-1 text-3xl font-semibold">{formatEUR(delivered._sum.commissionCents ?? 0, locale)}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <Link
            href="/admin/restaurants"
            className="flex h-14 items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed"
          >
            {t.restaurantsCommission}
          </Link>
          <Link
            href="/admin/orders"
            className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-base font-medium text-ink hover:bg-bg-muted"
          >
            {t.orders}
          </Link>
          <Link
            href="/admin/payouts"
            className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-base font-medium text-ink hover:bg-bg-muted"
          >
            {t.payoutsMonday}
          </Link>
        </div>
      </div>
    </PanelShell>
  );
}
