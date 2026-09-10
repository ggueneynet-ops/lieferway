import { PanelShell } from "@/components/panel-shell";
import { getCopy } from "@/lib/get-locale";

export default async function AdminSecurityPage() {
  const { t } = await getCopy();
  return (
    <PanelShell roles={["ADMIN"]} title={t.adminSecurity}>
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">{t.admin2fa}</h2>
          <p className="mt-2 text-sm text-text-secondary">{t.admin2faHint}</p>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" disabled />
            {t.admin2faEnable}
          </label>
          <p className="mt-3 text-sm text-text-secondary">{t.admin2faNote}</p>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">{t.password}</h2>
          <p className="mt-2 text-sm text-text-secondary">{t.adminStrongPassword}</p>
        </section>
      </div>
    </PanelShell>
  );
}
