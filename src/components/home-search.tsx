"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/components/locale-provider";

export function HomeSearch({
  initialQ,
  plz,
  cuisine,
  km,
  action = "/",
  autoFocus = false,
}: {
  initialQ: string;
  plz?: string | null;
  cuisine?: string;
  km?: number | null;
  action?: string;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  return (
    <form className="flex gap-2" action={action} method="get">
      {plz ? <input type="hidden" name="plz" value={plz} /> : null}
      {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
      {plz ? <input type="hidden" name="km" value={km == null ? "all" : String(km)} /> : null}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-[1.05rem] top-1/2 size-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={2} />
        <input
          name="q"
          defaultValue={initialQ}
          placeholder={t.searchPlaceholder}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          className="h-[3.25rem] w-full rounded-full border-0 bg-[#F4F4F5] pl-12 pr-5 text-[15px] text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none placeholder:text-[#9CA3AF] focus:bg-white focus:shadow-[0_4px_16px_rgba(15,23,42,0.06)] focus:ring-2 focus:ring-[#E91E63]/18"
        />
      </div>
    </form>
  );
}
