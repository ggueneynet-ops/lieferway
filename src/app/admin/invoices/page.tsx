import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { formatEUR } from "@/lib/money";
import { listCommissionInvoices, recentMonthKeys } from "@/lib/invoices";
import { formatBerlinInvoiceDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminInvoicesPage() {
  const { t, locale } = await getCopy();
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  const invoices = await listCommissionInvoices();
  const months = recentMonthKeys(4);

  return (
    <PanelShell roles={["ADMIN"]} title={t.navInvoices}>
      <p className="mb-4 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <span className="font-semibold">{t.eInvoiceComing}</span>
        <span className="mt-1 block text-[#6B7280]">{t.eInvoiceComingHint}</span>
      </p>
      <p className="mb-4 max-w-2xl text-sm text-text-secondary">{t.commissionInvoiceHint}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">{t.commissionInvoiceDraft}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b bg-bg-muted text-text-secondary">
              <tr>
                <th className="px-4 py-2 font-medium">{t.restaurants}</th>
                {months.map((m) => (
                  <th key={m} className="px-4 py-2 font-medium">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  {months.map((m) => (
                    <td key={m} className="px-4 py-3">
                      <a
                        href={`/api/invoices/commission?month=${m}&slug=${r.slug}`}
                        className="text-primary"
                      >
                        {t.downloadPdf}
                      </a>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">{t.navInvoices}</h2>
        {invoices.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-4 text-sm text-text-secondary">
            {t.commissionInvoiceHint}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{inv.number}</p>
                  <p className="text-text-secondary">
                    {inv.status === "DRAFT" ? t.invoiceDraft : t.invoiceIssued} ·{" "}
                    {formatEUR(inv.totalCents, locale)} · {formatBerlinInvoiceDate(inv.createdAt, locale)}
                  </p>
                </div>
                <a href={`/api/invoices/${inv.id}`} className="font-medium text-primary">
                  {t.downloadPdf}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PanelShell>
  );
}
