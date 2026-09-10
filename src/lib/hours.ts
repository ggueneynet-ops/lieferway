import { addDaysYmd, berlinYmd, startOfBerlinDay } from "@/lib/restaurant-reports";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type DayHours = { closed: boolean; open: string; close: string };
export type WeekHours = Record<Weekday, DayHours>;

export const DEFAULT_DAY: DayHours = { closed: false, open: "11:00", close: "22:00" };

export const DEFAULT_HOURS: WeekHours = {
  1: { ...DEFAULT_DAY },
  2: { ...DEFAULT_DAY },
  3: { ...DEFAULT_DAY },
  4: { ...DEFAULT_DAY },
  5: { ...DEFAULT_DAY, close: "23:00" },
  6: { ...DEFAULT_DAY, close: "23:00" },
  7: { closed: false, open: "12:00", close: "21:00" },
};

export function parseHours(raw?: string | null): WeekHours {
  const base: WeekHours = {
    1: { ...DEFAULT_HOURS[1] },
    2: { ...DEFAULT_HOURS[2] },
    3: { ...DEFAULT_HOURS[3] },
    4: { ...DEFAULT_HOURS[4] },
    5: { ...DEFAULT_HOURS[5] },
    6: { ...DEFAULT_HOURS[6] },
    7: { ...DEFAULT_HOURS[7] },
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, Partial<DayHours>>>;
    for (const d of WEEKDAYS) {
      const row = parsed[String(d)];
      if (!row) continue;
      base[d] = {
        closed: Boolean(row.closed),
        open: /^\d{2}:\d{2}$/.test(row.open ?? "") ? (row.open as string) : base[d].open,
        close: /^\d{2}:\d{2}$/.test(row.close ?? "") ? (row.close as string) : base[d].close,
      };
    }
  } catch {
    return base;
  }
  return base;
}

export function serializeHours(hours: WeekHours) {
  return JSON.stringify(hours);
}

export function nextPayoutMonday(now = new Date()): { date: Date; ymd: string; isToday: boolean } {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  const daysUntil = offset === 0 ? 0 : 7 - offset;
  const ymd = addDaysYmd(berlinYmd(now), daysUntil);
  return { date: startOfBerlinDay(ymd), ymd, isToday: offset === 0 };
}

export const PREP_MINUTES = [10, 20, 30, 45] as const;
