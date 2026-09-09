"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR, eurosToCents } from "@/lib/money";
import { toast } from "sonner";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
  categoryId: string;
  imageUrl?: string | null;
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
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(initial[0]?.id ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  void restaurantId;

  async function addItem() {
    if (name.trim().length < 2) return toast.error("Bitte einen Namen eingeben.");
    const priceCents = eurosToCents(price);
    if (priceCents <= 0) return toast.error("Bitte einen Preis eingeben.");
    setBusy(true);
    const res = await fetch("/api/restaurant/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        priceCents,
        categoryId: newCategory.trim() ? undefined : categoryId,
        categoryName: newCategory.trim() || undefined,
        imageUrl: photo.trim() || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(data.error);
    const catId = data.item.categoryId as string;
    setCategories((cats) => {
      const exists = cats.some((c) => c.id === catId);
      if (!exists) {
        return [...cats, { id: catId, name: newCategory.trim() || "Speisen", items: [data.item] }];
      }
      return cats.map((c) => (c.id === catId ? { ...c, items: [...c.items, data.item] } : c));
    });
    setName("");
    setPrice("");
    setPhoto("");
    setNewCategory("");
    if (catId) setCategoryId(catId);
    toast.success("Gespeichert");
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
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Neuen Artikel hinzufügen</h2>
        <p className="mt-1 text-sm text-text-secondary">Name, Preis, Kategorie — fertig.</p>
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="item-name" className="text-base">
              Name
            </Label>
            <Input
              id="item-name"
              className="mt-1 h-12 text-base"
              placeholder="z. B. Adana Kebap"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="item-price" className="text-base">
              Preis (€)
            </Label>
            <Input
              id="item-price"
              className="mt-1 h-12 text-base"
              inputMode="decimal"
              placeholder="12,90"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="item-cat" className="text-base">
              Kategorie
            </Label>
            {categories.length > 0 && (
              <select
                id="item-cat"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={Boolean(newCategory.trim())}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Input
              className="mt-2 h-12 text-base"
              placeholder={categories.length ? "Oder neue Kategorie eingeben" : "z. B. Grill"}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="item-photo" className="text-base">
              Foto (optional)
            </Label>
            <Input
              id="item-photo"
              className="mt-1 h-12 text-base"
              placeholder="https://…"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
            />
          </div>
          <Button className="h-12 w-full text-base" size="lg" disabled={busy} onClick={addItem}>
            {busy ? "…" : "Speichern"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Speisekarte</h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-border bg-surface">
              <p className="border-b border-border px-4 py-3 font-medium">{cat.name}</p>
              {cat.items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-text-secondary">Noch keine Artikel.</p>
              ) : (
                <ul>
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                    >
                      <div>
                        <p className={item.isAvailable ? "font-medium" : "text-text-secondary line-through"}>
                          {item.name}
                        </p>
                        <p className="text-sm text-text-secondary">{formatEUR(item.priceCents)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" onClick={() => toggle(item)}>
                          {item.isAvailable ? "Aus" : "An"}
                        </Button>
                        <Button variant="ghost" onClick={() => remove(item)}>
                          Löschen
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
