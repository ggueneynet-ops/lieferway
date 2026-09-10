"use client";

import { Search } from "lucide-react";

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
          placeholder="Restaurant oder Gericht suchen"
          className="h-11 w-full rounded-full border border-[#E8E8EC] bg-[#F7F7F8] pl-10 pr-4 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#922A49] focus:bg-white focus:ring-2 focus:ring-[#922A49]/15"
        />
      </div>
    </form>
  );
}
