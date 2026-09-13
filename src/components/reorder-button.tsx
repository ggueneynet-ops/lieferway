"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { dishPhoto } from "@/lib/media";

type Preview = {
  ok: boolean;
  messages: string[];
  addable: {
    menuItemId: string;
    name: string;
    priceCents: number;
    quantity: number;
    imageUrl: string | null;
  }[];
  restaurant: {
    id: string;
    slug: string;
    name: string;
    minOrderCents: number;
    listedDeliveryFeeCents: number;
    pickupAllowed: boolean;
    restaurantAddress: string;
    restaurantCity: string;
    restaurantPostalCode: string;
    etaMin: number;
    isActive: boolean;
  } | null;
};

export function ReorderButton({ orderId, cuisine }: { orderId: string; cuisine?: string }) {
  const { t } = useI18n();
  const { add, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/reorder`);
      const data = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(data.error ?? t.error);
      for (const msg of data.messages ?? []) {
        toast.message(msg);
      }
      if (!data.ok || !data.restaurant || data.addable.length === 0) {
        toast.error(t.reorderNothing);
        return;
      }
      clear();
      const r = data.restaurant;
      for (const line of data.addable) {
        add(
          {
            restaurantId: r.id,
            restaurantSlug: r.slug,
            restaurantName: r.name,
            minOrderCents: r.minOrderCents,
            listedDeliveryFeeCents: r.listedDeliveryFeeCents,
            pickupAllowed: r.pickupAllowed,
            restaurantAddress: r.restaurantAddress,
            restaurantCity: r.restaurantCity,
            restaurantPostalCode: r.restaurantPostalCode,
            etaMin: r.etaMin,
          },
          {
            menuItemId: line.menuItemId,
            name: line.name,
            priceCents: line.priceCents,
            imageUrl: dishPhoto(line.imageUrl, cuisine, line.name),
          },
          line.quantity,
        );
      }
      toast.success(t.reorderDone);
      router.push("/checkout");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-2"
      disabled={busy}
      onClick={() => void run()}
    >
      <RotateCcw className="size-4" strokeWidth={2} />
      {busy ? t.processing : t.reorderAgain}
    </Button>
  );
}
