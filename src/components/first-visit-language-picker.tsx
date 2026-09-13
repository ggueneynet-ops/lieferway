"use client";

import { useI18n } from "@/components/locale-provider";
import { LanguageFlag } from "@/components/language-flag";
import { LANGUAGE_LABELS, LOCALES, type Locale } from "@/lib/i18n";

export function FirstVisitLanguagePicker() {
  const { locale, setLocale, t, hasChosen, ready } = useI18n();
  if (!ready || hasChosen) return null;

  return (
    <div className="lw-wrap pt-3" data-first-visit-language="">
      <div className="inline-flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-[#E8E8EC] bg-white px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <p className="text-[12px] font-semibold tracking-wide text-[#64748B]">{t.chooseLanguage}</p>
        <div className="flex items-center gap-2" role="group" aria-label={t.chooseLanguage}>
          {LOCALES.map((code: Locale) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-0.5 text-[11px] font-medium text-[#0F172A]"
                aria-pressed={active}
                aria-label={LANGUAGE_LABELS[code]}
              >
                <LanguageFlag locale={code} active={active} size="md" />
                <span className={active ? "text-[#C2185B]" : "text-[#64748B]"}>{code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
