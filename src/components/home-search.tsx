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
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={initialQ}
          placeholder={t.searchPlaceholder}
          className="h-12 w-full rounded-2xl border border-border bg-white pl-10 pr-3 text-sm outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-primary/25"
        />
      </div>
    </form>
  );
}
