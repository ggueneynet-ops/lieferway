import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/constants";
import { parseLocale, t, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function getCopy() {
  const locale = await getRequestLocale();
  return { locale, t: t(locale) };
}
