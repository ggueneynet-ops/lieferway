import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

function entityHref(entityType: string, entityId: string | null) {
  if (!entityId) return null;
  if (entityType === "Order") return `/admin/orders/${entityId}`;
  if (entityType === "Restaurant") return `/admin/restaurants/${entityId}`;
  return null;
}

export default async function AdminAuditPage() {
  const { t, locale } = await getCopy();
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminAuditLog}>
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-text-secondary">{t.adminAuditLogHint}</p>
        {rows.length === 0 ? (
          <p className="rounded-2xl border bg-white p-4 text-sm text-text-secondary">{t.adminLogsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-bg-muted text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.period}</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Entity</th>
                  <th className="px-3 py-2 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const href = entityHref(row.entityType, row.entityId);
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{formatBerlinDateTime(row.createdAt, locale)}</td>
                      <td className="px-3 py-2">
                        {row.actorEmail || row.actorId || "—"}
                      </td>
                      <td className="px-3 py-2 font-medium">{row.action}</td>
                      <td className="px-3 py-2">
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {row.entityType}
                            {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
                          </Link>
                        ) : (
                          <>
                            {row.entityType}
                            {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{row.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
