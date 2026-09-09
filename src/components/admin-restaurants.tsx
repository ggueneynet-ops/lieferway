"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUISINES, DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";
import { toast } from "sonner";

type R = {
  id: string;
  name: string;
  cuisine: string;
  commissionPercent: number;
  isActive: boolean;
  owner: { name: string; email: string };
};

export function AdminRestaurants({ initial }: { initial: R[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, String(r.commissionPercent)])),
  );
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState<string>(CUISINES[0]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [commission, setCommission] = useState(String(DEFAULT_COMMISSION_PERCENT));
  const [busy, setBusy] = useState(false);

  async function addRestaurant() {
    setBusy(true);
    const res = await fetch("/api/admin/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cuisine,
        ownerName,
        ownerEmail,
        commissionPercent: Number(commission),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => [...rs, data.restaurant]);
    setDraft((d) => ({ ...d, [data.restaurant.id]: String(data.restaurant.commissionPercent) }));
    setName("");
    setOwnerName("");
    setOwnerEmail("");
    setCommission(String(DEFAULT_COMMISSION_PERCENT));
    toast.success(`Restaurant angelegt. Login: ${data.restaurant.owner.email} / lieferway`);
  }

  async function save(id: string) {
    const res = await fetch("/api/admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, commissionPercent: Number(draft[id]) }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, commissionPercent: data.restaurant.commissionPercent } : r)));
    toast.success("Provision gespeichert");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Neues Restaurant</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-base">Name</Label>
            <Input className="mt-1 h-12 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Café Main" />
          </div>
          <div>
            <Label className="text-base">Küche</Label>
            <select
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
            >
              {CUISINES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-base">Inhaber Name</Label>
            <Input className="mt-1 h-12 text-base" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div>
            <Label className="text-base">Inhaber E-Mail</Label>
            <Input className="mt-1 h-12 text-base" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="lokal@lieferway.de" />
          </div>
          <div>
            <Label className="text-base">Provision %</Label>
            <Input className="mt-1 h-12 text-base" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
            <p className="mt-1 text-sm text-text-secondary">Standard: {DEFAULT_COMMISSION_PERCENT} %</p>
          </div>
          <Button className="h-12 w-full text-base" size="lg" disabled={busy} onClick={addRestaurant}>
            {busy ? "…" : "Restaurant anlegen"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Provision</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-base">
            <thead className="border-b border-border bg-bg-muted text-sm text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Restaurant</th>
                <th className="px-4 py-3 font-medium">Provision %</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-4">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-text-secondary">{r.cuisine}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      className="h-12 w-24 text-base"
                      value={draft[r.id] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button className="h-12 px-5 text-base" onClick={() => save(r.id)}>
                      Speichern
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
