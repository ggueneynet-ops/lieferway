"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/components/locale-provider";

export function HomeSearch({
  initialQ,
  plz,
  cuisine,
  km,
  action = "/",
}: {
  initialQ: string;
  plz?: string | null;
  cuisine?: string;
  km?: number | null;
  action?: string;
}) {
  const { t } = useI18n();

  return (
    <form className="flex gap-2" action={action} method="get">
      {plz ? <input type="hidden" name="plz" value={plz} /> : null}
      {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
      {plz ? <input type="hidden" name="km" value={km == null ? "all" : String(km)} /> : null}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          name="q"
          defaultValue={initialQ}
          placeholder={t.searchPlaceholder}
          className="h-11 w-full rounded-full border border-[#E8E8EC] bg-[#F7F7F8] pl-10 pr-4 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#E91E63] focus:bg-white focus:ring-2 focus:ring-[#E91E63]/15"
        />
      </div>
    </form>
  );
}
