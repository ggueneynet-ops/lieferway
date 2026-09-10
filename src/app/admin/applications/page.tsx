import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";
import { cuisineName } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, "applicationPending" | "applicationContacted" | "applicationApproved" | "applicationRejected"> = {
  PENDING: "applicationPending",
  CONTACTED: "applicationContacted",
  APPROVED: "applicationApproved",
  REJECTED: "applicationRejected",
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; email?: string; name?: string }>;
}) {
  const q = await searchParams;
  const { t, locale } = await getCopy();
  const apps = await prisma.partnerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <PanelShell roles={["ADMIN"]} title={t.partnerApplications}>
      <div className="mx-auto max-w-xl space-y-4">
        {q.error ? (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-base text-danger">{q.error}</p>
        ) : null}
        {q.ok === "approved" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">
            {interpolate(t.approvedCredentials, { email: q.email ?? "" })}
            <br />
            <span className="text-sm">{t.partnerNotifyHint}</span>
          </p>
        ) : null}

        {apps.length === 0 ? (
          <p className="rounded-2xl bg-bg-muted px-4 py-8 text-center text-muted-foreground">{t.noApplications}</p>
        ) : (
          apps.map((app) => {
            const open = app.status === "PENDING" || app.status === "CONTACTED";
            return (
              <article key={app.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{app.businessName}</p>
                    <p className="text-sm text-text-secondary">
                      {cuisineName(locale, app.cuisine)} · {app.postalCode} {app.city}
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {app.contactName} · {app.email} · {app.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.street}</p>
                    {app.website ? (
                      <p className="truncate text-sm text-primary">{app.website}</p>
                    ) : null}
                    {app.message ? <p className="mt-2 text-sm text-muted-foreground">{app.message}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-bg-muted px-2.5 py-1 text-[11px] font-medium">
                    {t[STATUS_COPY[app.status] ?? "applicationPending"]}
                  </span>
                </div>
                {open ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action="/admin/applications/approve" method="post">
                      <input type="hidden" name="id" value={app.id} />
                      <button
                        type="submit"
                        className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
                      >
                        {t.adminApproveAccess}
                      </button>
                    </form>
                    {app.status === "PENDING" ? (
                      <form action="/admin/applications/status" method="post">
                        <input type="hidden" name="id" value={app.id} />
                        <input type="hidden" name="status" value="CONTACTED" />
                        <button type="submit" className="h-11 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-bg-muted">
                          {t.adminCheck}
                        </button>
                      </form>
                    ) : null}
                    <form action="/admin/applications/status" method="post">
                      <input type="hidden" name="id" value={app.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <button type="submit" className="h-11 rounded-xl px-4 text-sm font-medium text-danger hover:bg-danger/10">
                        {t.rejectApplication}
                      </button>
                    </form>
                  </div>
                ) : app.adminNote ? (
                  <p className="mt-2 text-xs text-muted-foreground">{app.adminNote}</p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </PanelShell>
  );
}
