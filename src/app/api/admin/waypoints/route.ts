import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { parseCampaignType, parseFundedBy } from "@/lib/waypoints";
import { adminWayPointsOverview, setPointsPerEuro } from "@/lib/waypoints-service";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const overview = await adminWayPointsOverview();
    return json(overview);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const settingsSchema = z.object({
  pointsPerEuro: z.number().int().min(1).max(1000).optional(),
  restaurantId: z.string().optional(),
  wayPointsDisabledByAdmin: z.boolean().optional(),
  wayPointsEnabled: z.boolean().optional(),
});

const campaignSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional(),
  type: z.enum(["MULTIPLIER", "FIRST_ORDER_BONUS", "BONUS_POINTS", "BONUS_VOUCHER"]),
  multiplier: z.number().min(1).max(10).optional().nullable(),
  bonusPoints: z.number().int().min(1).optional().nullable(),
  bonusDiscountCents: z.number().int().min(1).optional().nullable(),
  fundedBy: z.enum(["RESTAURANT", "LIEFERWAY", "SHARED"]).optional(),
  restaurantId: z.string().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  firstOrderOnly: z.boolean().optional(),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) return fail("Kampagne unvollständig.");
    const type = parseCampaignType(parsed.data.type);
    if (!type) return fail("Kampagnentyp ungültig.");
    const campaign = await prisma.wayPointsCampaign.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        type,
        multiplier: type === "MULTIPLIER" ? parsed.data.multiplier ?? 2 : null,
        bonusPoints:
          type === "FIRST_ORDER_BONUS" || type === "BONUS_POINTS" ? parsed.data.bonusPoints ?? null : null,
        bonusDiscountCents: type === "BONUS_VOUCHER" ? parsed.data.bonusDiscountCents ?? null : null,
        fundedBy: parseFundedBy(parsed.data.fundedBy ?? "LIEFERWAY"),
        restaurantId: parsed.data.restaurantId || null,
        validFrom: parseDate(parsed.data.validFrom),
        validUntil: parseDate(parsed.data.validUntil),
        isActive: parsed.data.isActive ?? true,
        firstOrderOnly: parsed.data.firstOrderOnly ?? type === "FIRST_ORDER_BONUS",
      },
    });
    return json({ campaign }, 201);
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
    if (body?.pointsPerEuro != null || body?.restaurantId) {
      const parsed = settingsSchema.safeParse(body);
      if (!parsed.success) return fail("Ungültige Einstellungen.");
      if (parsed.data.pointsPerEuro != null) {
        const settings = await setPointsPerEuro(parsed.data.pointsPerEuro);
        return json({ settings });
      }
      if (parsed.data.restaurantId) {
        const restaurant = await prisma.restaurant.update({
          where: { id: parsed.data.restaurantId },
          data: {
            ...(parsed.data.wayPointsDisabledByAdmin != null
              ? { wayPointsDisabledByAdmin: parsed.data.wayPointsDisabledByAdmin }
              : {}),
            ...(parsed.data.wayPointsEnabled != null
              ? { wayPointsEnabled: parsed.data.wayPointsEnabled }
              : {}),
            ...(parsed.data.wayPointsDisabledByAdmin
              ? { wayPointsEnabled: false }
              : {}),
          },
          select: {
            id: true,
            name: true,
            wayPointsEnabled: true,
            wayPointsDisabledByAdmin: true,
          },
        });
        return json({ restaurant });
      }
    }
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) return fail("Kampagne unvollständig.");
    const campaign = await prisma.wayPointsCampaign.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        type: parsed.data.type,
        multiplier: parsed.data.multiplier ?? undefined,
        bonusPoints: parsed.data.bonusPoints ?? undefined,
        bonusDiscountCents: parsed.data.bonusDiscountCents ?? undefined,
        fundedBy: parseFundedBy(parsed.data.fundedBy ?? "LIEFERWAY"),
        restaurantId: parsed.data.restaurantId || null,
        validFrom: parseDate(parsed.data.validFrom),
        validUntil: parseDate(parsed.data.validUntil),
        isActive: parsed.data.isActive,
        firstOrderOnly: parsed.data.firstOrderOnly,
      },
    });
    return json({ campaign });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
