import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { CUISINES, DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; name?: string; email?: string }>;
}) {
  const q = await searchParams;
  const restaurants = await prisma.restaurant.findMany({
    include: { owner: { select: { email: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <PanelShell roles={["ADMIN"]} title="Restaurants">
      <div className="mx-auto max-w-xl space-y-8">
        {q.error ? (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-base text-danger">{q.error}</p>
        ) : null}
        {q.ok === "1" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">
            {q.name} ist angelegt und im Marktplatz sichtbar.
            <br />
            Login: {q.email} / lieferway
          </p>
        ) : null}
        {q.ok === "provision" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">Provision gespeichert.</p>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Neues Restaurant</h2>
          <p className="mt-1 text-sm text-text-secondary">Kurzes Formular. Speichern legt Inhaber-Konto und Marktplatz-Eintrag an.</p>
          <form action="/admin/restaurants/create" method="post" className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="text-base font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder="z. B. Café Main"
              />
            </div>
            <div>
              <label htmlFor="cuisine" className="text-base font-medium">
                Küche
              </label>
              <select
                id="cuisine"
                name="cuisine"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                defaultValue={CUISINES[0]}
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ownerName" className="text-base font-medium">
                Inhaber Name
              </label>
              <input id="ownerName" name="ownerName" required minLength={2} className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base" />
            </div>
            <div>
              <label htmlFor="ownerEmail" className="text-base font-medium">
                Inhaber E-Mail
              </label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                required
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder="lokal@lieferway.de"
              />
            </div>
            <div>
              <label htmlFor="commissionPercent" className="text-base font-medium">
                Provision %
              </label>
              <input
                id="commissionPercent"
                name="commissionPercent"
                inputMode="decimal"
                defaultValue={String(DEFAULT_COMMISSION_PERCENT)}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              />
              <p className="mt-1 text-sm text-text-secondary">Standard: {DEFAULT_COMMISSION_PERCENT} %</p>
            </div>
            <button type="submit" className="h-14 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed">
              Restaurant anlegen
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Liste ({restaurants.length})</h2>
          {restaurants.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-base font-medium text-ink">{r.name}</p>
              <p className="text-sm text-text-secondary">
                {r.cuisine} · {r.owner.email}
              </p>
              <form action="/admin/restaurants/commission" method="post" className="mt-3 flex items-center gap-3">
                <input type="hidden" name="id" value={r.id} />
                <label className="sr-only" htmlFor={`c-${r.id}`}>
                  Provision {r.name}
                </label>
                <input
                  id={`c-${r.id}`}
                  name="commissionPercent"
                  defaultValue={String(r.commissionPercent)}
                  inputMode="decimal"
                  className="h-12 w-24 rounded-lg border border-border bg-background px-3 text-base"
                />
                <span className="text-sm text-text-secondary">%</span>
                <button type="submit" className="h-12 flex-1 rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed">
                  Speichern
                </button>
              </form>
            </div>
          ))}
        </section>
      </div>
    </PanelShell>
  );
}
