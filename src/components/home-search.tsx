"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

export function HomeSearch({ initialQ }: { initialQ: string }) {
  const { t } = useI18n();

  return (
    <form className="mt-6 flex gap-2" action="/" method="get">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={initialQ}
          placeholder={t.searchPlaceholder}
          className="h-12 rounded-xl pl-10"
        />
      </div>
      <Button type="submit" className="h-12 rounded-xl px-6">
        {t.search}
      </Button>
    </form>
  );
}
