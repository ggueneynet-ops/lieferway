import { prisma } from "@/lib/prisma";

export const REPORT_EXCLUDED_STATUSES = ["REJECTED", "CANCELLED", "PENDING_PAYMENT"];

const TZ = "Europe/Berlin";

export type ReportPreset = "today" | "7d" | "30d" | "month" | "all" | "custom";

const PRESETS: ReportPreset[] = ["today", "7d", "30d", "month", "all", "custom"];

export function parseReportPreset(value?: string | null): ReportPreset {
  if (value && PRESETS.includes(value as ReportPreset)) return value as ReportPreset;
  return "30d";
}

export function berlinYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function asBerlinWallClock(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second")),
    ),
  );
}

export function startOfBerlinDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const wall = asBerlinWallClock(new Date(utcGuess));
  const intended = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(utcGuess + (intended - wall.getTime()));
}

export function addDaysYmd(ymd: string, days: number): string {
  const start = startOfBerlinDay(ymd);
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
  return berlinYmd(next);
}

export function startOfBerlinMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function resolveReportRange(
  preset: ReportPreset,
  fromYmd?: string | null,
  toYmd?: string | null,
): { from: Date | null; to: Date | null; fromYmd: string | null; toYmd: string | null } {
  const today = berlinYmd();
  if (preset === "all") {
    return { from: null, to: null, fromYmd: null, toYmd: null };
  }
  if (preset === "custom") {
    const from = fromYmd && /^\d{4}-\d{2}-\d{2}$/.test(fromYmd) ? fromYmd : today;
    const to = toYmd && /^\d{4}-\d{2}-\d{2}$/.test(toYmd) ? toYmd : today;
    const start = startOfBerlinDay(from <= to ? from : to);
    const endExclusive = startOfBerlinDay(addDaysYmd(from <= to ? to : from, 1));
    return {
      from: start,
      to: endExclusive,
      fromYmd: from <= to ? from : to,
      toYmd: from <= to ? to : from,
    };
  }
  if (preset === "today") {
    return {
      from: startOfBerlinDay(today),
      to: startOfBerlinDay(addDaysYmd(today, 1)),
      fromYmd: today,
      toYmd: today,
    };
  }
  if (preset === "7d") {
    const from = addDaysYmd(today, -6);
    return {
      from: startOfBerlinDay(from),
      to: startOfBerlinDay(addDaysYmd(today, 1)),
      fromYmd: from,
      toYmd: today,
    };
  }
  if (preset === "30d") {
    const from = addDaysYmd(today, -29);
    return {
      from: startOfBerlinDay(from),
      to: startOfBerlinDay(addDaysYmd(today, 1)),
      fromYmd: from,
      toYmd: today,
    };
  }
  const from = startOfBerlinMonth(today);
  return {
    from: startOfBerlinDay(from),
    to: startOfBerlinDay(addDaysYmd(today, 1)),
    fromYmd: from,
    toYmd: today,
  };
}

export type RestaurantReportTotals = {
  orderCount: number;
  cancelledCount: number;
  foodCents: number;
  gmvCents: number;
  commissionCents: number;
};

export async function restaurantReportTotals(
  restaurantId: string,
  range: { from: Date | null; to: Date | null },
): Promise<RestaurantReportTotals> {
  const createdAt =
    range.from || range.to
      ? {
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lt: range.to } : {}),
        }
      : undefined;

  const [counted, cancelled] = await Promise.all([
    prisma.order.aggregate({
      where: {
        restaurantId,
        status: { notIn: REPORT_EXCLUDED_STATUSES },
        ...(createdAt ? { createdAt } : {}),
      },
      _count: true,
      _sum: {
        foodSubtotalCents: true,
        totalCents: true,
        commissionCents: true,
      },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: REPORT_EXCLUDED_STATUSES },
        ...(createdAt ? { createdAt } : {}),
      },
    }),
  ]);

  return {
    orderCount: counted._count,
    cancelledCount: cancelled,
    foodCents: counted._sum.foodSubtotalCents ?? 0,
    gmvCents: counted._sum.totalCents ?? 0,
    commissionCents: counted._sum.commissionCents ?? 0,
  };
}

export async function restaurantSnapshotMap() {
  const rows = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: { status: { notIn: REPORT_EXCLUDED_STATUSES } },
    _count: true,
    _sum: {
      foodSubtotalCents: true,
      commissionCents: true,
    },
  });
  return new Map(
    rows.map((row) => [
      row.restaurantId,
      {
        orderCount: row._count,
        foodCents: row._sum.foodSubtotalCents ?? 0,
        commissionCents: row._sum.commissionCents ?? 0,
      },
    ]),
  );
}
