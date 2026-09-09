"use client";

import { createContext, useContext, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { type Dictionary, t as dict } from "@/lib/i18n";

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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");

  function setLocale(l: Locale) {
    setLocaleState(l);
    window.localStorage.setItem("lw_locale", l);
    document.cookie = `lw_locale=${l};path=/;max-age=31536000`;
    document.documentElement.lang = l === "tr" ? "tr" : "de";
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
