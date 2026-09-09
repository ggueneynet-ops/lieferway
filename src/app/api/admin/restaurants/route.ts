import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";
import { createRestaurantRecord } from "@/lib/create-restaurant";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const restaurants = await prisma.restaurant.findMany({
      include: { owner: { select: { email: true, name: true } }, _count: { select: { orders: true, items: true } } },
      orderBy: { name: "asc" },
    });
    return json({ restaurants, defaultCommissionPercent: DEFAULT_COMMISSION_PERCENT });
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
    const result = await createRestaurantRecord({
      name: String(body?.name ?? ""),
      cuisine: String(body?.cuisine ?? ""),
      ownerName: String(body?.ownerName ?? ""),
      ownerEmail: String(body?.ownerEmail ?? ""),
      commissionPercent: Number(body?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT),
    });
    if ("error" in result) return fail(result.error);
    return json({ restaurant: result.restaurant, password: result.password }, 201);
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
    if (!body?.id) return fail("Restaurant-ID fehlt.");
    const restaurant = await prisma.restaurant.update({
      where: { id: body.id },
      data: {
        commissionPercent:
          body.commissionPercent !== undefined ? Number(body.commissionPercent) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        isOpen: body.isOpen !== undefined ? Boolean(body.isOpen) : undefined,
      },
    });
    return json({ restaurant });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
