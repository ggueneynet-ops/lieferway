import { getSession, requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isWayPointsParticipating, previewEarnPoints } from "@/lib/waypoints";
import {
  bestEarnMultiplier,
  customerWayPointsPage,
  getWayPointsSettings,
  loadRedeemableRewards,
} from "@/lib/waypoints-service";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurantId");
    const subtotal = Number(url.searchParams.get("subtotal") ?? "0");
    const items = (url.searchParams.get("items") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (restaurantId) {
      const session = await getSession();
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true,
          name: true,
          wayPointsEnabled: true,
          wayPointsDisabledByAdmin: true,
        },
      });
      if (!restaurant) return fail("Restaurant nicht gefunden.", 404);
      const participating = isWayPointsParticipating(restaurant);
      if (!participating) {
        return json({ participating: false, earnPreview: 0, rewards: [] });
      }
      const settings = await getWayPointsSettings();
      const multiplier = await bestEarnMultiplier(restaurant.id);
      const earnPreview = previewEarnPoints({
        foodSubtotalCents: Number.isFinite(subtotal) ? subtotal : 0,
        pointsPerEuro: settings.pointsPerEuro,
        multiplier,
      });
      const rewards = session
        ? await loadRedeemableRewards({
            restaurantId: restaurant.id,
            userId: session.id,
            foodSubtotalCents: Number.isFinite(subtotal) ? subtotal : 0,
            cartMenuItemIds: items,
          })
        : [];
      const balance = session
        ? ((
            await prisma.user.findUnique({
              where: { id: session.id },
              select: { wayPointsBalance: true },
            })
          )?.wayPointsBalance ?? 0)
        : 0;
      return json({
        participating: true,
        restaurantName: restaurant.name,
        pointsPerEuro: settings.pointsPerEuro,
        earnPreview,
        balance,
        rewards,
        availableCount: rewards.filter((r) => r.available).length,
      });
    }

    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const page = await customerWayPointsPage(session.id);
    return json(page);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
