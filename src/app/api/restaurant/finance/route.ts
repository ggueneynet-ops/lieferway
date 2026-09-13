import { requireSession } from "@/lib/auth";
import { fail, json, options, csv } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  bucketOrdersByWeek,
  loadSettlementOrders,
  parseWeekStartParam,
  summarizeOrders,
  toYmdBerlin,
  weekEnd,
  weekStart,
} from "@/lib/payouts";
import { parseReportPreset, resolveReportRange } from "@/lib/restaurant-reports";
import { ORDER_CSV_HEADERS, toCsv, weeklySummariesToCsv, settleOrder } from "@/lib/settlement";

export async function OPTIONS() {
  return options();
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function GET(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);

    const url = new URL(req.url);
    const week = parseWeekStartParam(url.searchParams.get("week"));
    const preset = parseReportPreset(url.searchParams.get("preset"));
    const range = week
      ? {
          from: week,
          to: new Date(weekEnd(week).getTime() + 1),
          fromYmd: toYmdBerlin(week),
          toYmd: toYmdBerlin(weekEnd(week)),
        }
      : resolveReportRange(preset, url.searchParams.get("from"), url.searchParams.get("to"));

    const orders = await loadSettlementOrders({
      restaurantId: restaurant.id,
      from: range.from,
      to: range.to,
    });
    const totals = summarizeOrders(orders);
    const weekly = bucketOrdersByWeek(orders);
    const payouts = await prisma.payout.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { weekStart: "desc" },
      take: 16,
    });
    const payoutStatus = new Map(payouts.map((p) => [p.weekStart.toISOString(), p]));

    const format = url.searchParams.get("format");
    if (format === "csv") {
      const kind = url.searchParams.get("kind") === "orders" ? "orders" : "weekly";
      if (kind === "orders") {
        const body = toCsv(
          [...ORDER_CSV_HEADERS],
          orders.map((order) => {
            const start = weekStart(order.deliveredAt ?? order.createdAt);
            const line = settleOrder(order);
            return [
              order.shortCode,
              start.toISOString().slice(0, 10),
              order.status,
              order.paymentMethod,
              order.paymentStatus,
              order.deliveredAt ? order.deliveredAt.toISOString() : "",
              line.grossGuestCents,
              line.foodCents,
              line.couponDiscountCents,
              line.wayPointsRestaurantCents,
              line.wayPointsLieferwayCents,
              line.commissionCents,
              line.refundedCents,
              line.netPayableCents,
            ];
          }),
        );
        return csv(body, `lieferway-abrechnung-orders-${restaurant.slug}.csv`);
      }
      const body = weeklySummariesToCsv(
        weekly.map((w) => ({
          restaurant: restaurant.name,
          restaurantId: restaurant.id,
          weekStart: w.weekStart.toISOString().slice(0, 10),
          weekEnd: w.weekEnd.toISOString().slice(0, 10),
          totals: w.totals,
          status: payoutStatus.get(w.weekStart.toISOString())?.status ?? "PENDING",
        })),
      );
      return csv(body, `lieferway-abrechnung-wochen-${restaurant.slug}.csv`);
    }

    return json({
      restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, commissionPercent: restaurant.commissionPercent },
      range: { fromYmd: range.fromYmd, toYmd: range.toYmd, preset: week ? "week" : preset },
      totals,
      weekly: weekly.map((w) => ({
        weekStart: w.weekStart.toISOString(),
        weekEnd: w.weekEnd.toISOString(),
        totals: w.totals,
        status: payoutStatus.get(w.weekStart.toISOString())?.status ?? "PENDING",
        payoutId: payoutStatus.get(w.weekStart.toISOString())?.id ?? null,
        storedNetPayoutCents: payoutStatus.get(w.weekStart.toISOString())?.netPayoutCents ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
