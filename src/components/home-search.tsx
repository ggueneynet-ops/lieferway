"use client";

import { Search } from "lucide-react";
import { useI18n } from "@/components/locale-provider";

export function HomeSearch({
  initialQ,
  plz,
  cuisine,
  km,
}: {
  initialQ: string;
  plz?: string | null;
  cuisine?: string;
  km?: number | null;
}) {
  const { t } = useI18n();

  return (
    <form className="flex gap-2" action="/" method="get">
      {plz ? <input type="hidden" name="plz" value={plz} /> : null}
      {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
      {plz ? <input type="hidden" name="km" value={km == null ? "all" : String(km)} /> : null}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={initialQ}
          placeholder={t.searchPlaceholder}
          className="h-11 w-full rounded-xl border-0 bg-bg-muted pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </form>
  );
}
