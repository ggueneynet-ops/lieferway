import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function OPTIONS() {
  return options();
}

async function restaurantFor(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({ orderBy: { name: "asc" } });
  }
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const owned =
      session.role === "RESTAURANT"
        ? await prisma.restaurant.findUnique({
            where: { ownerId: session.id },
            include: {
              categories: { orderBy: { sortOrder: "asc" }, include: { items: true } },
            },
          })
        : await prisma.restaurant.findFirst({
            include: {
              categories: { orderBy: { sortOrder: "asc" }, include: { items: true } },
            },
          });
    if (!owned) return fail("Kein Restaurant verknüpft.", 404);
    return json({ restaurant: owned });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const itemSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  priceCents: z.number().int().positive(),
  categoryId: z.string(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await restaurantFor(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    if (body?.type === "category") {
      const name = String(body.name ?? "").trim();
      if (name.length < 2) return fail("Kategoriename fehlt.");
      const category = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name, sortOrder: 99 },
      });
      return json({ category }, 201);
    }
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) return fail("Artikel unvollständig.");
    const item = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        ...parsed.data,
        isAvailable: parsed.data.isAvailable ?? true,
      },
    });
    return json({ item }, 201);
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
    const restaurant = await restaurantFor(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const body = await req.json().catch(() => null);
    if (body?.isOpen !== undefined) {
      const updated = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { isOpen: Boolean(body.isOpen) },
      });
      return json({ restaurant: updated });
    }
    if (!body?.id) return fail("Artikel-ID fehlt.");
    const existing = await prisma.menuItem.findFirst({
      where: { id: body.id, restaurantId: restaurant.id },
    });
    if (!existing) return fail("Artikel nicht gefunden.", 404);
    const item = await prisma.menuItem.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        priceCents: body.priceCents ?? existing.priceCents,
        isAvailable: body.isAvailable ?? existing.isAvailable,
        categoryId: body.categoryId ?? existing.categoryId,
        imageUrl: body.imageUrl === undefined ? existing.imageUrl : body.imageUrl,
      },
    });
    return json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await restaurantFor(session.id, session.role);
    if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return fail("Artikel-ID fehlt.");
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: restaurant.id },
    });
    if (!existing) return fail("Artikel nicht gefunden.", 404);
    await prisma.menuItem.delete({ where: { id } });
    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
