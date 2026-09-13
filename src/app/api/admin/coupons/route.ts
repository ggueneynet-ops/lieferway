import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

/** Admin: list all restaurant Gutscheine (with restaurant) — no platform create. */
export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const coupons = await prisma.coupon.findMany({
      include: {
        restaurant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
    });
    return json({ coupons });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

/** Admin may only deactivate (or re-activate) — restaurants own creation. */
export async function PATCH(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    if (!body?.id) return fail("Gutschein-ID fehlt.");
    const coupon = await prisma.coupon.update({
      where: { id: body.id },
      data: { isActive: Boolean(body.isActive) },
      include: {
        restaurant: { select: { id: true, name: true, slug: true } },
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
