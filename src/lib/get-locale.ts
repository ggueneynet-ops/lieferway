import { cookies, headers } from "next/headers";
import { LEGACY_LOCALE_COOKIE, LOCALE_COOKIE } from "@/lib/constants";
import { parseLocale, suggestLocaleFromBrowser, t, type Locale } from "@/lib/i18n";

export function readStoredLocaleCookie(get: (name: string) => string | undefined): string | undefined {
  return get(LOCALE_COOKIE) ?? get(LEGACY_LOCALE_COOKIE);
}

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_COOKIE)?.value ?? jar.get(LEGACY_LOCALE_COOKIE)?.value;
  if (stored) return parseLocale(stored);
  const accept = (await headers()).get("accept-language");
  return suggestLocaleFromBrowser(accept);
}

export async function getCopy() {
  const locale = await getRequestLocale();
  return { locale, t: t(locale) };
}

export async function getStoredLocaleChoice(): Promise<{ locale: Locale; chosen: boolean }> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_COOKIE)?.value ?? jar.get(LEGACY_LOCALE_COOKIE)?.value;
  if (stored) return { locale: parseLocale(stored), chosen: true };
  const accept = (await headers()).get("accept-language");
  return { locale: suggestLocaleFromBrowser(accept), chosen: false };
}
