"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type C = {
  id: string;
  code: string;
  description: string;
  discountPercent: number | null;
  discountCents: number | null;
  isActive: boolean;
};

export function AdminCoupons({ initial }: { initial: C[] }) {
  const [rows, setRows] = useState(initial);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [percent, setPercent] = useState("10");
  const router = useRouter();

  async function create() {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        description,
        discountPercent: Number(percent) || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((r) => [...r, data.coupon]);
    setCode("");
    setDescription("");
    router.refresh();
  }

  async function toggle(c: C) {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
    if (!res.ok) return;
    setRows((rs) => rs.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <ul className="divide-y rounded-2xl border bg-white">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{c.code}</p>
              <p className="text-muted-foreground">{c.description}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(c)}>
              {c.isActive ? "Aktiv" : "Aus"}
            </Button>
          </li>
        ))}
      </ul>
      <div className="h-fit space-y-3 rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Neuer Gutschein</h2>
        <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder="% Rabatt" value={percent} onChange={(e) => setPercent(e.target.value)} />
        <Button className="w-full" onClick={create}>
          Anlegen
        </Button>
      </div>
    </div>
  );
}
