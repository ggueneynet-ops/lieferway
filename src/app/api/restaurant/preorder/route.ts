import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { parsePreorderHours, parsePreorderWeekdays } from "@/lib/preorder";

export async function OPTIONS() {
  return options();
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    return json({
      settings: {
        preorderEnabled: restaurant.preorderEnabled,
        preorderMaxDaysAhead: restaurant.preorderMaxDaysAhead,
        preorderMinLeadMinutes: restaurant.preorderMinLeadMinutes,
        preorderWeekdays: parsePreorderWeekdays(restaurant.preorderWeekdaysJson),
        preorderHours: parsePreorderHours(restaurant.preorderHoursJson),
        preorderDelivery: restaurant.preorderDelivery,
        preorderPickup: restaurant.preorderPickup,
        preorderMaxConcurrent: restaurant.preorderMaxConcurrent,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const patchSchema = z.object({
  preorderEnabled: z.boolean(),
  preorderMaxDaysAhead: z.number().int().min(1).max(30),
  preorderMinLeadMinutes: z.number().int().min(0).max(7 * 24 * 60),
  preorderWeekdays: z.array(z.number().int().min(1).max(7)).min(1),
  preorderHours: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  preorderDelivery: z.boolean(),
  preorderPickup: z.boolean(),
  preorderMaxConcurrent: z.number().int().min(1).max(500).nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Einstellungen unvollständig.");
    if (!parsed.data.preorderDelivery && !parsed.data.preorderPickup) {
      return fail("Mindestens Lieferung oder Abholung für Vorbestellung wählen.");
    }
    const weekdays = [...new Set(parsed.data.preorderWeekdays)].sort();
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        preorderEnabled: parsed.data.preorderEnabled,
        preorderMaxDaysAhead: parsed.data.preorderMaxDaysAhead,
        preorderMinLeadMinutes: parsed.data.preorderMinLeadMinutes,
        preorderWeekdaysJson: JSON.stringify(weekdays),
        preorderHoursJson: JSON.stringify(parsed.data.preorderHours),
        preorderDelivery: parsed.data.preorderDelivery,
        preorderPickup: parsed.data.preorderPickup,
        preorderMaxConcurrent: parsed.data.preorderMaxConcurrent ?? null,
      },
    });
    return json({
      settings: {
        preorderEnabled: updated.preorderEnabled,
        preorderMaxDaysAhead: updated.preorderMaxDaysAhead,
        preorderMinLeadMinutes: updated.preorderMinLeadMinutes,
        preorderWeekdays: parsePreorderWeekdays(updated.preorderWeekdaysJson),
        preorderHours: parsePreorderHours(updated.preorderHoursJson),
        preorderDelivery: updated.preorderDelivery,
        preorderPickup: updated.preorderPickup,
        preorderMaxConcurrent: updated.preorderMaxConcurrent,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
