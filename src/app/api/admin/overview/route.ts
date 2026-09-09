import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { regeneratePayouts } from "@/lib/payouts";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const [users, restaurants, orders, coupons, payouts] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.coupon.count(),
      prisma.payout.findMany({
        include: { restaurant: { select: { name: true } } },
        orderBy: { weekStart: "desc" },
      }),
    ]);
    const delivered = await prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { foodSubtotalCents: true, commissionCents: true, totalCents: true, deliveryFeeCents: true },
    });
    return json({
      defaultCommissionPercent: DEFAULT_COMMISSION_PERCENT,
      stats: {
        users,
        restaurants,
        orders,
        coupons,
        foodVolumeCents: delivered._sum.foodSubtotalCents ?? 0,
        commissionCents: delivered._sum.commissionCents ?? 0,
        gmvCents: delivered._sum.totalCents ?? 0,
        deliveryFeesCents: delivered._sum.deliveryFeeCents ?? 0,
      },
      payouts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    if (body?.action === "regenerate-payouts") {
      const payouts = await regeneratePayouts();
      return json({ payouts });
    }
    return fail("Unbekannte Aktion.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
