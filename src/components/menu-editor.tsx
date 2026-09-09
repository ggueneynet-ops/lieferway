"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR, eurosToCents } from "@/lib/money";
import { toast } from "sonner";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  categoryId: string;
};
type Category = { id: string; name: string; items: Item[] };

export function MenuEditor({
  restaurantId,
  categories: initial,
}: {
  restaurantId: string;
  categories: Category[];
}) {
  const [categories, setCategories] = useState(initial);
  const [catName, setCatName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("9,90");
  const [categoryId, setCategoryId] = useState(initial[0]?.id ?? "");
  const router = useRouter();
  void restaurantId;

  async function addCategory() {
    const res = await fetch("/api/restaurant/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "category", name: catName }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setCategories((c) => [...c, { ...data.category, items: [] }]);
    setCatName("");
    setCategoryId(data.category.id);
  }

  async function addItem() {
    const res = await fetch("/api/restaurant/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        priceCents: eurosToCents(price),
        categoryId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setCategories((cats) =>
      cats.map((c) => (c.id === categoryId ? { ...c, items: [...c.items, data.item] } : c)),
    );
    setName("");
    setDescription("");
    toast.success("Artikel angelegt");
    router.refresh();
  }

  async function toggle(item: Item) {
    const res = await fetch("/api/restaurant/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
    });
    if (!res.ok) return;
    setCategories((cats) =>
      cats.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)),
      })),
    );
  }

  async function remove(item: Item) {
    const res = await fetch(`/api/restaurant/menu?id=${item.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Löschen fehlgeschlagen");
    setCategories((cats) =>
      cats.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== item.id) })),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        {categories.map((cat) => (
          <section key={cat.id} className="rounded-lg border border-border bg-surface p-3">
            <h2 className="text-[13px] font-semibold">{cat.name}</h2>
            <ul className="mt-3 divide-y">
              {cat.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className={item.isAvailable ? "font-medium" : "text-muted-foreground line-through"}>
                      {item.name}
                    </p>
                    <p className="text-muted-foreground">{formatEUR(item.priceCents)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggle(item)}>
                      {item.isAvailable ? "Pausieren" : "Aktiv"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item)}>
                      Löschen
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <aside className="space-y-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="text-[13px] font-semibold">Kategorie</h2>
          <Input className="mt-3" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="z. B. Meze" />
          <Button className="mt-3 w-full" variant="outline" onClick={addCategory}>
            Kategorie anlegen
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <h2 className="text-[13px] font-semibold">Neuer Artikel</h2>
          <div className="mt-3 space-y-3">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Preis (€)</Label>
              <Input className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Kategorie</Label>
              <select
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={addItem}>
              Speichern
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
