"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";

type Props = {
  orderId: string;
  /** When true, label as "Erneut drucken" (same action — manual reprint). */
  reprint?: boolean;
};

/**
 * Opens the UTF-8 80mm Lieferbon and triggers the system print dialog.
 * Printing is best-effort: order data already lives in the DB / panel.
 * Popup blockers fall back to `/restaurant/bon/[id]` for manual reprint.
 */
export function PrintBonButton({ orderId, reprint = false }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const label = reprint ? t.reprintBon : t.printBon;

  async function printTicket() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/bon`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error(t.printBonFailed);
        toast.message(t.printBonOfflineHint);
        return;
      }
      const html = await res.text();
      const w = window.open("", "lw-bon", "width=420,height=800");
      if (!w) {
        // Popup blocked — dedicated tab still allows manual print / reprint.
        window.open(`/restaurant/bon/${orderId}`, "_blank", "noopener,noreferrer");
        toast.message(t.printBonOfflineHint);
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      window.setTimeout(() => {
        try {
          w.print();
        } catch {
          toast.message(t.printBonOfflineHint);
        }
      }, 500);
    } catch {
      toast.error(t.printBonFailed);
      toast.message(t.printBonOfflineHint);
      try {
        window.open(`/restaurant/bon/${orderId}`, "_blank", "noopener,noreferrer");
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void printTicket()}
      disabled={busy}
      title={t.lieferbonHint}
      aria-label={label}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827] disabled:opacity-60"
    >
      <Printer className="size-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}
