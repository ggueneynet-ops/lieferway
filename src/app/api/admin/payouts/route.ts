import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { regeneratePayouts } from "@/lib/payouts";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const payouts = await prisma.payout.findMany({
      include: { restaurant: { select: { name: true, slug: true } } },
      orderBy: [{ weekStart: "desc" }, { restaurant: { name: "asc" } }],
    });
    return json({ payouts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function POST() {
  try {
    await requireSession(["ADMIN"]);
    const payouts = await regeneratePayouts();
    return json({ payouts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSession(["ADMIN"]);
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
    return json({ payout });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
