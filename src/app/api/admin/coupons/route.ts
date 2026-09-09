import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });
    return json({ coupons });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

const schema = z.object({
  code: z.string().min(3),
  description: z.string().min(3),
  discountPercent: z.number().int().min(1).max(80).optional(),
  discountCents: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Gutschein unvollständig.");
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        description: parsed.data.description,
        discountPercent: parsed.data.discountPercent ?? null,
        discountCents: parsed.data.discountCents ?? null,
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

export async function PATCH(req: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await req.json().catch(() => null);
    if (!body?.id) return fail("Gutschein-ID fehlt.");
    const coupon = await prisma.coupon.update({
      where: { id: body.id },
      data: { isActive: Boolean(body.isActive) },
    });
    return json({ coupon });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
