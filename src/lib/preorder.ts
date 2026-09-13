import { BERLIN_TZ } from "@/lib/datetime";

export type PreorderSettings = {
  preorderEnabled: boolean;
  preorderMaxDaysAhead: number;
  preorderMinLeadMinutes: number;
  preorderWeekdaysJson: string | null;
  preorderHoursJson: string | null;
  preorderDelivery: boolean;
  preorderPickup: boolean;
  preorderMaxConcurrent: number | null;
};

export type PreorderHours = { open: string; close: string };

const DEFAULT_HOURS: PreorderHours = { open: "11:00", close: "22:00" };

export function parsePreorderWeekdays(raw?: string | null): number[] {
  if (!raw) return [1, 2, 3, 4, 5, 6, 7];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [1, 2, 3, 4, 5, 6, 7];
    const days = parsed
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    return days.length ? [...new Set(days)].sort() : [1, 2, 3, 4, 5, 6, 7];
  } catch {
    return [1, 2, 3, 4, 5, 6, 7];
  }
}

export function parsePreorderHours(raw?: string | null): PreorderHours {
  if (!raw) return { ...DEFAULT_HOURS };
  try {
    const parsed = JSON.parse(raw) as Partial<PreorderHours>;
    const open = /^\d{2}:\d{2}$/.test(parsed.open ?? "") ? (parsed.open as string) : DEFAULT_HOURS.open;
    const close = /^\d{2}:\d{2}$/.test(parsed.close ?? "") ? (parsed.close as string) : DEFAULT_HOURS.close;
    return { open, close };
  } catch {
    return { ...DEFAULT_HOURS };
  }
}

function berlinParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const wd = get("weekday");
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    weekday: map[wd] ?? 1,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    hm: `${get("hour")}:${get("minute")}`,
  };
}

/** Parse `YYYY-MM-DDTHH:mm` as Europe/Berlin wall time → UTC Date. */
export function berlinWallTimeToUtc(ymd: string, hm: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !/^\d{2}:\d{2}$/.test(hm)) return null;
  let utc = new Date(`${ymd}T${hm}:00.000Z`);
  for (let i = 0; i < 4; i++) {
    const parts = berlinParts(utc);
    const [wy, wm, wd] = ymd.split("-").map(Number);
    const [wh, wmin] = hm.split(":").map(Number);
    const [gy, gm, gd] = parts.ymd.split("-").map(Number);
    const [gh, gmin] = parts.hm.split(":").map(Number);
    const want = Date.UTC(wy, wm - 1, wd, wh, wmin);
    const got = Date.UTC(gy, gm - 1, gd, gh, gmin);
    const delta = want - got;
    if (delta === 0) return utc;
    utc = new Date(utc.getTime() + delta);
  }
  const check = berlinParts(utc);
  if (check.ymd !== ymd || check.hm !== hm) return null;
  return utc;
}

function hmToMinutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export type PreorderValidationOk = { ok: true; scheduledFor: Date };
export type PreorderValidationErr = { ok: false; error: string };
export type PreorderValidation = PreorderValidationOk | PreorderValidationErr;

export function validateScheduledFor(opts: {
  settings: PreorderSettings;
  scheduledForIso: string | null | undefined;
  fulfillmentType: "DELIVERY" | "PICKUP";
  now?: Date;
}): PreorderValidation {
  const { settings, fulfillmentType } = opts;
  const now = opts.now ?? new Date();
  const raw = opts.scheduledForIso?.trim();

  if (!raw) {
    return { ok: false, error: "Bitte Wunschzeit wählen." };
  }
  if (!settings.preorderEnabled) {
    return { ok: false, error: "Vorbestellung ist für dieses Restaurant nicht aktiv." };
  }
  if (fulfillmentType === "DELIVERY" && !settings.preorderDelivery) {
    return { ok: false, error: "Vorbestellung ist nur für Abholung möglich." };
  }
  if (fulfillmentType === "PICKUP" && !settings.preorderPickup) {
    return { ok: false, error: "Vorbestellung ist nur für Lieferung möglich." };
  }

  let scheduled: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !raw.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    const [datePart, timePart] = raw.split("T");
    scheduled = berlinWallTimeToUtc(datePart, timePart.slice(0, 5));
  } else {
    const d = new Date(raw);
    scheduled = Number.isNaN(d.getTime()) ? null : d;
  }
  if (!scheduled) return { ok: false, error: "Ungültige Wunschzeit." };

  const leadMs = Math.max(0, settings.preorderMinLeadMinutes) * 60_000;
  if (scheduled.getTime() < now.getTime() + leadMs) {
    return { ok: false, error: "Wunschzeit liegt zu nah an jetzt." };
  }

  const maxDays = Math.min(30, Math.max(1, settings.preorderMaxDaysAhead || 1));
  const maxMs = maxDays * 24 * 60 * 60_000;
  if (scheduled.getTime() > now.getTime() + maxMs) {
    return { ok: false, error: "Wunschzeit liegt zu weit in der Zukunft." };
  }

  const parts = berlinParts(scheduled);
  const weekdays = parsePreorderWeekdays(settings.preorderWeekdaysJson);
  if (!weekdays.includes(parts.weekday)) {
    return { ok: false, error: "An diesem Wochentag sind keine Vorbestellungen möglich." };
  }

  const hours = parsePreorderHours(settings.preorderHoursJson);
  const slot = hmToMinutes(parts.hm);
  const open = hmToMinutes(hours.open);
  const close = hmToMinutes(hours.close);
  if (close > open) {
    if (slot < open || slot > close) {
      return { ok: false, error: "Wunschzeit liegt außerhalb der Vorbestell-Zeiten." };
    }
  } else {
    // overnight window
    if (slot < open && slot > close) {
      return { ok: false, error: "Wunschzeit liegt außerhalb der Vorbestell-Zeiten." };
    }
  }

  return { ok: true, scheduledFor: scheduled };
}

export function isBannerLive(opts: {
  bannerActive: boolean;
  bannerText: string | null | undefined;
  bannerStartsAt: Date | null | undefined;
  bannerEndsAt: Date | null | undefined;
  now?: Date;
}) {
  const text = (opts.bannerText ?? "").trim();
  if (!opts.bannerActive || !text) return false;
  const now = opts.now ?? new Date();
  if (opts.bannerStartsAt && opts.bannerStartsAt.getTime() > now.getTime()) return false;
  if (opts.bannerEndsAt && opts.bannerEndsAt.getTime() < now.getTime()) return false;
  return true;
}

export function isOfferLive(opts: {
  isActive: boolean;
  validFrom: Date | null | undefined;
  validTo: Date | null | undefined;
  funding?: string | null;
  now?: Date;
}) {
  if (!opts.isActive) return false;
  if (opts.funding && opts.funding !== "RESTAURANT") return false;
  const now = opts.now ?? new Date();
  if (opts.validFrom && opts.validFrom.getTime() > now.getTime()) return false;
  if (opts.validTo && opts.validTo.getTime() < now.getTime()) return false;
  return true;
}
