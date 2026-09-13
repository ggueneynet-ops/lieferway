import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isBannerLive } from "@/lib/preorder";

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
    return json({
      banner: {
        bannerText: restaurant.bannerText,
        bannerActive: restaurant.bannerActive,
        bannerStartsAt: restaurant.bannerStartsAt,
        bannerEndsAt: restaurant.bannerEndsAt,
        live: isBannerLive(restaurant),
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
  bannerText: z.string().max(280).nullable().optional(),
  bannerActive: z.boolean(),
  bannerStartsAt: z.string().nullable().optional(),
  bannerEndsAt: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail("Banner unvollständig.");
    const text = (parsed.data.bannerText ?? "").trim();
    if (parsed.data.bannerActive && !text) return fail("Bitte Banner-Text eingeben.");
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        bannerText: text || null,
        bannerActive: parsed.data.bannerActive,
        bannerStartsAt: parseDate(parsed.data.bannerStartsAt),
        bannerEndsAt: parseDate(parsed.data.bannerEndsAt),
      },
    });
    return json({
      banner: {
        bannerText: updated.bannerText,
        bannerActive: updated.bannerActive,
        bannerStartsAt: updated.bannerStartsAt,
        bannerEndsAt: updated.bannerEndsAt,
        live: isBannerLive(updated),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
