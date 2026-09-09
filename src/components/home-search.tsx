"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

export function HomeSearch({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ);
  const router = useRouter();
  const { t } = useI18n();

  return (
    <form
      className="mt-6 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        router.push(`/?${params.toString()}`);
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="h-12 rounded-xl pl-10"
        />
      </div>
      <Button type="submit" className="h-12 rounded-xl px-6">
        Suchen
      </Button>
    </form>
  );
}
