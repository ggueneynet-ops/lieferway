import {
  LEGACY_LOCALE_COOKIE,
  LEGACY_LOCALE_STORAGE_KEY,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "@/lib/constants";
import { parseLocale, type Locale } from "@/lib/i18n";

export const LANGUAGE_COOKIE_MAX_AGE = 31536000;

export function languageCookieWriter(locale: Locale) {
  return `${LOCALE_COOKIE}=${locale};path=/;max-age=${LANGUAGE_COOKIE_MAX_AGE};SameSite=Lax`;
}

export function legacyLanguageCookieWriter(locale: Locale) {
  return `${LEGACY_LOCALE_COOKIE}=${locale};path=/;max-age=${LANGUAGE_COOKIE_MAX_AGE};SameSite=Lax`;
}

export function readLanguageCookieValue(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  const next = cookieHeader.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=(de|en|tr)`, "i"));
  if (next?.[1]) return next[1].toLowerCase();
  const legacy = cookieHeader.match(new RegExp(`(?:^|; )${LEGACY_LOCALE_COOKIE}=(de|en|tr)`, "i"));
  return legacy?.[1]?.toLowerCase() ?? null;
}

export function readStoredLanguageChoice(input: {
  cookieHeader?: string | null;
  localStorageValue?: string | null;
  legacyLocalStorageValue?: string | null;
}): Locale | null {
  const raw =
    readLanguageCookieValue(input.cookieHeader) ??
    input.localStorageValue ??
    input.legacyLocalStorageValue;
  return raw ? parseLocale(raw) : null;
}

export function persistLanguageClient(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
  document.cookie = languageCookieWriter(locale);
  document.cookie = legacyLanguageCookieWriter(locale);
  document.documentElement.lang = locale;
}
