import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";
import { formatEUR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminWebhookLogsPage() {
  const { t, locale } = await getCopy();
  const [releases, events, failedCount] = await Promise.all([
    prisma.paymentReleaseLog.findMany({
      include: { order: { select: { id: true, shortCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.stripeEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.paymentReleaseLog.count({ where: { status: "FAILED" } }),
  ]);

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminWebhookLogs}>
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="text-sm text-text-secondary">{t.adminWebhookLogsHint}</p>
        <p className="text-sm">
          {t.adminFailedReleases}: <span className="font-semibold">{failedCount}</span>
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold">{t.adminPaymentReleaseLogs}</h2>
          {releases.length === 0 ? (
            <p className="rounded-2xl border bg-white p-4 text-sm text-text-secondary">{t.adminLogsEmpty}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-bg-muted text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.period}</th>
                    <th className="px-3 py-2 font-medium">{t.nr}</th>
                    <th className="px-3 py-2 font-medium">{t.status}</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">{t.amount}</th>
                    <th className="px-3 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{formatBerlinDateTime(r.createdAt, locale)}</td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/orders/${r.order.id}`} className="font-medium hover:underline">
                          {r.order.shortCode}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={r.status === "FAILED" ? "font-medium text-danger" : ""}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.action}
                        <span className="block text-xs text-text-secondary">{r.reason}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {r.amountCents != null ? formatEUR(r.amountCents, locale) : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[220px] truncate text-text-secondary" title={r.detail ?? ""}>
                        {r.detail || r.stripeId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">{t.adminStripeEvents}</h2>
          {events.length === 0 ? (
            <p className="rounded-2xl border bg-white p-4 text-sm text-text-secondary">{t.adminLogsEmpty}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b bg-bg-muted text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.period}</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Event ID</th>
                    <th className="px-3 py-2 font-medium">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{formatBerlinDateTime(e.createdAt, locale)}</td>
                      <td className="px-3 py-2">{e.type}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.id}</td>
                      <td className="px-3 py-2">{e.processedAt ? t.adminProcessed : t.adminPendingProcess}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
