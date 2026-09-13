"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

export function FavoriteButton({ restaurantId }: { restaurantId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites")
      .then(async (r) => {
        if (r.status === 401) return;
        if (!r.ok) return;
        const data = (await r.json()) as { favorites?: { restaurant: { id: string } }[] };
        if (!cancelled) {
          setOn(Boolean(data.favorites?.some((f) => f.restaurant.id === restaurantId)));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        const res = await fetch(`/api/favorites?restaurantId=${encodeURIComponent(restaurantId)}`, {
          method: "DELETE",
        });
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (!res.ok) throw new Error(t.error);
        setOn(false);
        toast.success(t.favRemoved);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? t.error);
        setOn(true);
        toast.success(t.favAdded);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5 rounded-full border-[#F8BBD0] bg-white px-3 text-[#C2185B]"
      disabled={busy}
      onClick={() => void toggle()}
      aria-pressed={on}
      aria-label={on ? t.favRemove : t.favAdd}
    >
      <Heart className={`size-4 ${on ? "fill-[#E91E63] text-[#E91E63]" : ""}`} strokeWidth={2} />
      {on ? t.favSaved : t.favSave}
    </Button>
  );
}
