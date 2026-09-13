import { requireSession } from "@/lib/auth";
import { fail, json, options, csv } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  listPayoutSummaries,
  parseWeekStartParam,
  regeneratePayouts,
} from "@/lib/payouts";
import { weeklySummariesToCsv } from "@/lib/settlement";

export async function OPTIONS() {
  return options();
}

function summariesToCsv(summaries: Awaited<ReturnType<typeof listPayoutSummaries>>) {
  return weeklySummariesToCsv(
    summaries.map((row) => ({
      restaurant: row.restaurantName,
      restaurantId: row.restaurantId,
      weekStart: row.weekStart.slice(0, 10),
      weekEnd: row.weekEnd.slice(0, 10),
      totals: row.totals,
      status: row.status,
    })),
  );
}

export async function GET(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const url = new URL(req.url);
    const week = parseWeekStartParam(url.searchParams.get("week"));
    const summaries = await listPayoutSummaries({
      weekStart: week,
      includeComputedWeeks: url.searchParams.get("computed") === "1",
    });
    if (url.searchParams.get("format") === "csv") {
      const ymd = week ? week.toISOString().slice(0, 10) : "all";
      return csv(summariesToCsv(summaries), `lieferway-payouts-${ymd}.csv`);
    }
    return json({ summaries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    const week = parseWeekStartParam(body?.weekStart ?? body?.week);
    const payouts = await regeneratePayouts(week ?? undefined);
    const summaries = await listPayoutSummaries({ weekStart: week });
    await writeAuditLog({
      actor: session,
      action: "PAYOUTS_REGENERATE",
      entityType: "Payout",
      entityId: week ? week.toISOString() : "all",
      summary: week
        ? `Wochenabrechnung erzeugt (${week.toISOString().slice(0, 10)}), ${payouts.length} Zeilen.`
        : `Wochenabrechnungen erzeugt, ${payouts.length} Zeilen.`,
      metadata: { weekStart: week?.toISOString() ?? null, count: payouts.length },
    });
    return json({ payouts, summaries });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    if (!body?.id) return fail("Auszahlung-ID fehlt.");
    const payout = await prisma.payout.update({
      where: { id: body.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: { restaurant: { select: { name: true } } },
    });
    await writeAuditLog({
      actor: session,
      action: "PAYOUT_MARK_PAID",
      entityType: "Payout",
      entityId: payout.id,
      summary: `Auszahlung ${payout.restaurant.name} als gezahlt markiert.`,
      metadata: { netPayoutCents: payout.netPayoutCents, weekStart: payout.weekStart.toISOString() },
    });
    return json({ payout });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
