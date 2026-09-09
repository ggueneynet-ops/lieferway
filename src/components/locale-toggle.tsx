"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  return (
    <div className="flex overflow-hidden rounded-full border text-xs font-medium">
      <button
        type="button"
        onClick={() => {
          setLocale("de");
          router.refresh();
        }}
        className={`px-2.5 py-1 ${locale === "de" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => {
          setLocale("tr");
          router.refresh();
        }}
        className={`px-2.5 py-1 ${locale === "tr" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      >
        TR
      </button>
    </div>
  );
}
