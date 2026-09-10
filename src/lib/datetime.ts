import { dateLocale, type Locale } from "@/lib/i18n";

export const BERLIN_TZ = "Europe/Berlin";

export function formatBerlinTime(value: Date | string, locale: Locale = "de") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BERLIN_TZ,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatBerlinDateTime(value: Date | string, locale: Locale = "de") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BERLIN_TZ,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatBerlinBonDate(value: Date | string, locale: Locale = "de") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BERLIN_TZ,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatBerlinInvoiceDate(value: Date | string, locale: Locale = "de") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BERLIN_TZ,
  }).format(new Date(value));
}

export function formatBerlinMonth(value: Date | string, locale: Locale = "de") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: BERLIN_TZ,
  }).format(new Date(value));
}
