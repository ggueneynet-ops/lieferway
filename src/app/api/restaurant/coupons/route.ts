import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode, parseCouponScope, parseCouponType } from "@/lib/coupons";
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
    const coupons = await prisma.coupon.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
    });
    return json({ restaurant: { id: restaurant.id, name: restaurant.name }, coupons });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const createSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  discountPercent: z.number().int().min(1).max(100).optional().nullable(),
  discountCents: z.number().int().min(1).optional().nullable(),
  /** Euro string or cents — panel sends euro for FIXED via discountEuro. */
  discountEuro: z.union([z.string(), z.number()]).optional().nullable(),
  maxDiscountCents: z.number().int().min(0).optional().nullable(),
  maxDiscountEuro: z.union([z.string(), z.number()]).optional().nullable(),
  minSubtotalCents: z.number().int().min(0).optional().nullable(),
  minSubtotalEuro: z.union([z.string(), z.number()]).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  maxTotalUses: z.number().int().min(1).optional().nullable(),
  usesPerCustomer: z.number().int().min(1).optional().nullable(),
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
    if (!parsed.success) return fail("Gutschein unvollständig.");

    const type = parseCouponType(parsed.data.type);
    if (!type) return fail("Typ ungültig.");
    const code = normalizeCouponCode(parsed.data.code);
    if (code.length < 2) return fail("Code zu kurz.");

    let discountPercent: number | null = null;
    let discountCents: number | null = null;
    if (type === "PERCENT") {
      discountPercent = parsed.data.discountPercent ?? null;
      if (!discountPercent) return fail("Prozent-Rabatt fehlt.");
    } else {
      discountCents =
        parsed.data.discountCents ??
        (parsed.data.discountEuro != null && parsed.data.discountEuro !== ""
          ? eurosToCents(parsed.data.discountEuro)
          : null);
      if (!discountCents || discountCents <= 0) return fail("Fixer Rabatt fehlt.");
    }

    const maxDiscountCents =
      parsed.data.maxDiscountCents ??
      (parsed.data.maxDiscountEuro != null && parsed.data.maxDiscountEuro !== ""
        ? eurosToCents(parsed.data.maxDiscountEuro)
        : null);
    const minSubtotalCents =
      parsed.data.minSubtotalCents ??
      (parsed.data.minSubtotalEuro != null && parsed.data.minSubtotalEuro !== ""
        ? eurosToCents(parsed.data.minSubtotalEuro)
        : null);

    const existing = await prisma.coupon.findFirst({
      where: { restaurantId: restaurant.id, code },
    });
    if (existing) return fail("Dieser Code existiert bereits für dein Restaurant.");

    const coupon = await prisma.coupon.create({
      data: {
        restaurantId: restaurant.id,
        code,
        description: (parsed.data.description ?? "").trim() || `${restaurant.name} Gutschein`,
        type,
        discountPercent,
        discountCents,
        maxDiscountCents: type === "PERCENT" ? maxDiscountCents : null,
        minSubtotalCents,
        validFrom: parseDate(parsed.data.validFrom),
        validTo: parseDate(parsed.data.validTo),
        maxTotalUses: parsed.data.maxTotalUses ?? null,
        usesPerCustomer: parsed.data.usesPerCustomer ?? null,
        scope: parseCouponScope(parsed.data.scope),
        funding: "RESTAURANT",
        isActive: parsed.data.isActive ?? true,
      },
    });
    return json({ coupon }, 201);
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
  description: z.string().max(200).optional(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  maxTotalUses: z.number().int().min(1).optional().nullable(),
  usesPerCustomer: z.number().int().min(1).optional().nullable(),
  scope: z.enum(["DELIVERY", "PICKUP", "BOTH"]).optional(),
  maxDiscountCents: z.number().int().min(0).optional().nullable(),
  minSubtotalCents: z.number().int().min(0).optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Gutschein-ID fehlt.");

    const existing = await prisma.coupon.findFirst({
      where: { id: parsed.data.id, restaurantId: restaurant.id },
    });
    if (!existing) return fail("Gutschein nicht gefunden.", 404);

    const coupon = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        isActive: parsed.data.isActive ?? existing.isActive,
        description: parsed.data.description ?? existing.description,
        validFrom:
          parsed.data.validFrom !== undefined ? parseDate(parsed.data.validFrom) : existing.validFrom,
        validTo: parsed.data.validTo !== undefined ? parseDate(parsed.data.validTo) : existing.validTo,
        maxTotalUses:
          parsed.data.maxTotalUses !== undefined ? parsed.data.maxTotalUses : existing.maxTotalUses,
        usesPerCustomer:
          parsed.data.usesPerCustomer !== undefined
            ? parsed.data.usesPerCustomer
            : existing.usesPerCustomer,
        scope: parsed.data.scope ? parseCouponScope(parsed.data.scope) : existing.scope,
        maxDiscountCents:
          parsed.data.maxDiscountCents !== undefined
            ? parsed.data.maxDiscountCents
            : existing.maxDiscountCents,
        minSubtotalCents:
          parsed.data.minSubtotalCents !== undefined
            ? parsed.data.minSubtotalCents
            : existing.minSubtotalCents,
      },
    });
    return json({ coupon });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
