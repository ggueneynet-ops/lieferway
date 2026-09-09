import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

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
    const name = String(body?.name ?? "").trim();
    const cuisine = String(body?.cuisine ?? "").trim() || "Sonstiges";
    const ownerName = String(body?.ownerName ?? "").trim();
    const ownerEmail = String(body?.ownerEmail ?? "").toLowerCase().trim();
    const commissionPercent = Number(body?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT);
    if (name.length < 2 || ownerName.length < 2 || !ownerEmail.includes("@")) {
      return fail("Name, Inhaber und E-Mail angeben.");
    }
    if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
      return fail("Diese E-Mail ist schon vergeben.");
    }
    const { hashPassword } = await import("@/lib/auth");
    const slugBase = name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: ownerName,
        passwordHash: await hashPassword("lieferway"),
        role: "RESTAURANT",
      },
    });
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name,
        slug: `${slugBase}-${owner.id.slice(-4)}`,
        description: `${name} in Frankfurt am Main.`,
        cuisine,
        address: "Frankfurt am Main",
        postalCode: "60311",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
        commissionPercent: Number.isFinite(commissionPercent) ? commissionPercent : DEFAULT_COMMISSION_PERCENT,
      },
      include: { owner: { select: { email: true, name: true } }, _count: { select: { orders: true } } },
    });
    await prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Speisen", sortOrder: 0 },
    });
    return json({ restaurant, password: "lieferway" }, 201);
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
