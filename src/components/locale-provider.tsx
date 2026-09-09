"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { parseLocale, t as dict, type Dictionary, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
};

const LocaleContext = createContext<Ctx>({
  locale: "de",
  setLocale: () => {},
  t: dict("de"),
});

function persist(locale: Locale) {
  window.localStorage.setItem("lw_locale", locale);
  document.cookie = `lw_locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = locale;
}

export function LocaleProvider({ children, initialLocale = "de" }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )lw_locale=(de|en|tr)/);
    const stored = window.localStorage.getItem("lw_locale");
    const next = parseLocale(match?.[1] ?? stored ?? initialLocale);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, [initialLocale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    persist(l);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dict(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}
