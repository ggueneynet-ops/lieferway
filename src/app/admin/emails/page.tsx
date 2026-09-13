import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminEmailLogsPage() {
  const { t, locale } = await getCopy();
  const [logs, failedCount] = await Promise.all([
    prisma.emailSendLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.emailSendLog.count({ where: { status: { in: ["FAILED", "ERROR"] } } }),
  ]);

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminEmailLogs}>
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-text-secondary">{t.adminEmailLogsHint}</p>
        <p className="text-sm">
          {t.adminFailedEmails}: <span className="font-semibold">{failedCount}</span>
        </p>
        {logs.length === 0 ? (
          <p className="rounded-2xl border bg-white p-4 text-sm text-text-secondary">{t.adminLogsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-bg-muted text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.period}</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">{t.status}</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">{formatBerlinDateTime(row.createdAt, locale)}</td>
                    <td className="px-3 py-2">
                      {row.eventType}
                      <span className="block max-w-[200px] truncate text-xs text-text-secondary" title={row.subject}>
                        {row.subject}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.toEmail}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.status === "FAILED" || row.status === "ERROR"
                            ? "font-medium text-danger"
                            : ""
                        }
                      >
                        {row.status}
                      </span>
                      <span className="block text-xs text-text-secondary">×{row.attemptCount}</span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.provider ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-text-secondary" title={row.lastError ?? ""}>
                      {row.lastError || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
