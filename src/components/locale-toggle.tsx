"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { LOCALES, type Locale } from "@/lib/i18n";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  return (
    <div className="flex overflow-hidden rounded-full border border-border text-[11px] font-medium sm:text-xs" role="group" aria-label="Language">
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => {
            setLocale(code);
            router.refresh();
          }}
          className={`px-2 py-1 sm:px-2.5 ${locale === code ? "bg-ink text-white" : "text-text-secondary hover:text-ink"}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
