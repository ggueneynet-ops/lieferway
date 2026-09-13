import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { parseFundedBy, parseRewardType, sharesToBps } from "@/lib/waypoints";

export async function OPTIONS() {
  return options();
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ orderBy: { name: "asc" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const [rewards, items] = await Promise.all([
      prisma.wayPointsReward.findMany({
        where: { restaurantId: restaurant.id },
        include: { freeMenuItem: { select: { id: true, name: true, priceCents: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id },
        select: { id: true, name: true, priceCents: true, isAvailable: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        wayPointsEnabled: restaurant.wayPointsEnabled,
        wayPointsBudgetCents: restaurant.wayPointsBudgetCents,
        wayPointsBudgetSpentCents: restaurant.wayPointsBudgetSpentCents,
        wayPointsDisabledByAdmin: restaurant.wayPointsDisabledByAdmin,
      },
      rewards,
      menuItems: items,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const toggleSchema = z.object({
  wayPointsEnabled: z.boolean().optional(),
  wayPointsBudgetCents: z.number().int().min(0).nullable().optional(),
});

const rewardSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional(),
  pointsCost: z.number().int().min(1).max(1_000_000),
  type: z.enum(["PERCENT", "FIXED", "FREE_ITEM"]),
  percentOff: z.number().int().min(1).max(100).optional().nullable(),
  discountCents: z.number().int().min(1).optional().nullable(),
  freeMenuItemId: z.string().optional().nullable(),
  minOrderCents: z.number().int().min(0).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  fundedBy: z.enum(["RESTAURANT", "LIEFERWAY", "SHARED"]).optional(),
  restaurantSharePercent: z.number().min(0).max(100).optional(),
  lieferwaySharePercent: z.number().min(0).max(100).optional(),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    if (restaurant.wayPointsDisabledByAdmin) {
      return fail("WayPoints wurde von Lieferway deaktiviert.", 403);
    }
    const body = await req.json().catch(() => null);
    const parsed = rewardSchema.safeParse(body);
    if (!parsed.success) return fail("Prämie unvollständig.");
    const type = parseRewardType(parsed.data.type);
    if (!type) return fail("Prämientyp ungültig.");
    if (type === "PERCENT" && !parsed.data.percentOff) return fail("Prozent-Rabatt fehlt.");
    if (type === "FIXED" && !parsed.data.discountCents) return fail("Fixer Rabatt fehlt.");
    if (type === "FREE_ITEM") {
      if (!parsed.data.freeMenuItemId) return fail("Bitte ein Menü-Produkt wählen.");
      const item = await prisma.menuItem.findFirst({
        where: { id: parsed.data.freeMenuItemId, restaurantId: restaurant.id },
      });
      if (!item) return fail("Produkt gehört nicht zu diesem Restaurant.");
    }
    const fundedBy = parseFundedBy(parsed.data.fundedBy);
    const shares =
      fundedBy === "SHARED"
        ? sharesToBps(parsed.data.restaurantSharePercent ?? 50, parsed.data.lieferwaySharePercent ?? 50)
        : fundedBy === "LIEFERWAY"
          ? { restaurantShareBps: 0, lieferwayShareBps: 10000 }
          : { restaurantShareBps: 10000, lieferwayShareBps: 0 };

    const reward = await prisma.wayPointsReward.create({
      data: {
        restaurantId: restaurant.id,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        pointsCost: parsed.data.pointsCost,
        type,
        percentOff: type === "PERCENT" ? parsed.data.percentOff ?? null : null,
        discountCents: type === "FIXED" ? parsed.data.discountCents ?? null : null,
        freeMenuItemId: type === "FREE_ITEM" ? parsed.data.freeMenuItemId ?? null : null,
        minOrderCents: parsed.data.minOrderCents ?? null,
        validFrom: parseDate(parsed.data.validFrom),
        validUntil: parseDate(parsed.data.validUntil),
        usageLimit: parsed.data.usageLimit ?? null,
        perCustomerLimit: parsed.data.perCustomerLimit ?? 1,
        isActive: parsed.data.isActive ?? true,
        fundedBy,
        restaurantShareBps: shares.restaurantShareBps,
        lieferwayShareBps: shares.lieferwayShareBps,
      },
    });
    return json({ reward }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    if (body && (typeof body.wayPointsEnabled === "boolean" || body.wayPointsBudgetCents !== undefined) && !body.id && !body.title) {
      const parsed = toggleSchema.safeParse(body);
      if (!parsed.success) return fail("Ungültig.");
      if (restaurant.wayPointsDisabledByAdmin && parsed.data.wayPointsEnabled) {
        return fail("WayPoints wurde von Lieferway deaktiviert.", 403);
      }
      const updated = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          wayPointsEnabled: parsed.data.wayPointsEnabled ?? restaurant.wayPointsEnabled,
          ...(parsed.data.wayPointsBudgetCents !== undefined
            ? { wayPointsBudgetCents: parsed.data.wayPointsBudgetCents }
            : {}),
        },
      });
      return json({
        restaurant: {
          id: updated.id,
          wayPointsEnabled: updated.wayPointsEnabled,
          wayPointsBudgetCents: updated.wayPointsBudgetCents,
          wayPointsBudgetSpentCents: updated.wayPointsBudgetSpentCents,
          wayPointsDisabledByAdmin: updated.wayPointsDisabledByAdmin,
        },
      });
    }
    const parsed = rewardSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) return fail("Prämie unvollständig.");
    const existing = await prisma.wayPointsReward.findFirst({
      where: { id: parsed.data.id, restaurantId: restaurant.id },
    });
    if (!existing) return fail("Prämie nicht gefunden.", 404);
    const type = parseRewardType(parsed.data.type) ?? parseRewardType(existing.type) ?? "FIXED";
    const fundedBy = parseFundedBy(parsed.data.fundedBy ?? existing.fundedBy);
    const shares =
      fundedBy === "SHARED"
        ? sharesToBps(parsed.data.restaurantSharePercent ?? 50, parsed.data.lieferwaySharePercent ?? 50)
        : fundedBy === "LIEFERWAY"
          ? { restaurantShareBps: 0, lieferwayShareBps: 10000 }
          : { restaurantShareBps: 10000, lieferwayShareBps: 0 };
    const reward = await prisma.wayPointsReward.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? existing.description,
        pointsCost: parsed.data.pointsCost,
        type,
        percentOff: type === "PERCENT" ? parsed.data.percentOff ?? null : null,
        discountCents: type === "FIXED" ? parsed.data.discountCents ?? null : null,
        freeMenuItemId: type === "FREE_ITEM" ? parsed.data.freeMenuItemId ?? null : null,
        minOrderCents: parsed.data.minOrderCents ?? null,
        validFrom: parseDate(parsed.data.validFrom),
        validUntil: parseDate(parsed.data.validUntil),
        usageLimit: parsed.data.usageLimit ?? null,
        perCustomerLimit: parsed.data.perCustomerLimit ?? existing.perCustomerLimit,
        isActive: parsed.data.isActive ?? existing.isActive,
        fundedBy,
        restaurantShareBps: shares.restaurantShareBps,
        lieferwayShareBps: shares.lieferwayShareBps,
      },
    });
    return json({ reward });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
