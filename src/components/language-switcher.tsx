"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { LanguageFlag } from "@/components/language-flag";
import { LANGUAGE_LABELS, LOCALES, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  align = "right",
}: {
  align?: "left" | "right";
} = {}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(code: Locale) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef} data-language-switcher="">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full hover:bg-[#F8FAFC]"
        aria-label={t.language}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <LanguageFlag locale={locale} active size="sm" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={t.language}
          className={`absolute z-50 mt-1.5 min-w-[11.5rem] rounded-2xl border border-[#E8E8EC] bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {LOCALES.map((code) => {
            const selected = locale === code;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(code)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] ${
                  selected ? "bg-[#FCE4EC] text-[#9D174D]" : "text-[#0F172A] hover:bg-[#F8FAFC]"
                }`}
              >
                <LanguageFlag locale={code} active={selected} size="sm" />
                <span className="font-medium">{LANGUAGE_LABELS[code]}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-[#94A3B8]">{code}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
