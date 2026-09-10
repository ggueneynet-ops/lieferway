"use client";

import { Printer } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";

export function PrintBonButton({ orderId }: { orderId: string }) {
  const { t } = useI18n();

  async function printTicket() {
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/bon`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error(t.printBonFailed);
        return;
      }
      const html = await res.text();
      const w = window.open("", "lw-bon", "width=420,height=800");
      if (!w) {
        window.open(`/restaurant/bon/${orderId}`, "_blank", "noopener,noreferrer");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      window.setTimeout(() => {
        w.print();
      }, 500);
    } catch {
      toast.error(t.printBonFailed);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void printTicket()}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827]"
    >
      <Printer className="size-4" strokeWidth={1.75} />
      {t.printBon}
    </button>
  );
}
