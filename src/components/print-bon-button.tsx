"use client";

import { Printer } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { bonHtml, type BonOrder } from "@/lib/bon";

export function PrintBonButton({ order }: { order: BonOrder }) {
  const { t, locale } = useI18n();

  function print() {
    const w = window.open("", "lw-bon", "width=420,height=720");
    if (!w) return;
    w.document.open();
    w.document.write(bonHtml(order, locale));
    w.document.close();
    w.focus();
    window.setTimeout(() => {
      w.print();
    }, 250);
  }

  return (
    <button
      type="button"
      onClick={print}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111827]"
    >
      <Printer className="size-4" strokeWidth={1.75} />
      {t.printBon}
    </button>
  );
}
