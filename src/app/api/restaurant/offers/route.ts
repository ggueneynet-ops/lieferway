import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";

export async function OPTIONS() {
  return options();
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const offers = await prisma.restaurantOffer.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return json({ offers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().max(400).optional(),
  type: z.enum(["PERCENT", "FIXED", "INFO"]),
  discountPercent: z.number().int().min(1).max(100).optional().nullable(),
  discountEuro: z.union([z.string(), z.number()]).optional().nullable(),
  minSubtotalEuro: z.union([z.string(), z.number()]).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  scope: z.enum(["DELIVERY", "PICKUP", "BOTH"]).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail("Angebot unvollständig.");

    let discountPercent: number | null = null;
    let discountCents: number | null = null;
    if (parsed.data.type === "PERCENT") {
      discountPercent = parsed.data.discountPercent ?? null;
      if (!discountPercent) return fail("Prozent fehlt.");
    } else if (parsed.data.type === "FIXED") {
      discountCents = eurosToCents(parsed.data.discountEuro ?? 0);
      if (!discountCents || discountCents < 1) return fail("Rabattbetrag fehlt.");
    }

    const offer = await prisma.restaurantOffer.create({
      data: {
        restaurantId: restaurant.id,
        title: parsed.data.title,
        description: parsed.data.description?.trim() ?? "",
        type: parsed.data.type,
        discountPercent,
        discountCents,
        minOrderCents: parsed.data.minSubtotalEuro
          ? eurosToCents(parsed.data.minSubtotalEuro)
          : null,
        validFrom: parseDate(parsed.data.validFrom),
        validTo: parseDate(parsed.data.validTo),
        scope: parsed.data.scope ?? "BOTH",
        funding: "RESTAURANT",
        isActive: parsed.data.isActive ?? true,
      },
    });
    return json({ offer }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().max(400).optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  scope: z.enum(["DELIVERY", "PICKUP", "BOTH"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Angebot unvollständig.");
    const existing = await prisma.restaurantOffer.findFirst({
      where: { id: parsed.data.id, restaurantId: restaurant.id },
    });
    if (!existing) return fail("Angebot nicht gefunden.", 404);
    const offer = await prisma.restaurantOffer.update({
      where: { id: existing.id },
      data: {
        isActive: parsed.data.isActive ?? existing.isActive,
        title: parsed.data.title ?? existing.title,
        description: parsed.data.description ?? existing.description,
        validFrom:
          parsed.data.validFrom === undefined ? existing.validFrom : parseDate(parsed.data.validFrom),
        validTo: parsed.data.validTo === undefined ? existing.validTo : parseDate(parsed.data.validTo),
        scope: parsed.data.scope ?? existing.scope,
        funding: "RESTAURANT",
      },
    });
    return json({ offer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
