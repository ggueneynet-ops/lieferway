"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEGACY_LOCALE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
} from "@/lib/constants";
import { persistLanguageClient, readStoredLanguageChoice } from "@/lib/language-persist";
import { parseLocale, t as dict, type Dictionary, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
  hasChosen: boolean;
  ready: boolean;
};

const LocaleContext = createContext<Ctx>({
  locale: "de",
  setLocale: () => {},
  t: dict("de"),
  hasChosen: false,
  ready: false,
});

async function saveAccountLocale(locale: Locale) {
  try {
    await fetch("/api/account/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ locale }),
    });
  } catch {
    /* guest or offline — cookie/localStorage still hold the choice */
  }
}

export function LocaleProvider({
  children,
  initialLocale = "de",
  initialChosen = false,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  initialChosen?: boolean;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [hasChosen, setHasChosen] = useState(initialChosen);
  const [ready, setReady] = useState(initialChosen);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = readStoredLanguageChoice({
        cookieHeader: document.cookie,
        localStorageValue: window.localStorage.getItem(LOCALE_STORAGE_KEY),
        legacyLocalStorageValue: window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY),
      });
      if (stored) {
        if (!cancelled) {
          setLocaleState(stored);
          persistLanguageClient(stored);
          setHasChosen(true);
          setReady(true);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as { user?: { locale?: string } };
          if (data.user?.locale && !cancelled) {
            const account = parseLocale(data.user.locale);
            setLocaleState(account);
            persistLanguageClient(account);
            setHasChosen(true);
            setReady(true);
            if (account !== initialLocale) router.refresh();
            return;
          }
        }
      } catch {
        /* guest */
      }

      if (!cancelled) {
        document.documentElement.lang = initialLocale;
        setHasChosen(false);
        setReady(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialLocale, router]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    persistLanguageClient(next);
    setHasChosen(true);
    setReady(true);
    void saveAccountLocale(next);
    router.refresh();
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dict(locale), hasChosen, ready }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}
