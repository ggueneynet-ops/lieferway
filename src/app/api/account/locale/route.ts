import { z } from "zod";
import type { Role } from "@/lib/constants";
import { applySessionCookie, getSession, logSafeError, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  locale: z.enum(["de", "en", "tr"]),
});

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("Bitte anmelden.", 401);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Ungültige Sprache.");

    const user = await prisma.user.update({
      where: { id: session.id },
      data: { locale: parsed.data.locale },
    });
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      locale: user.locale,
    });
    return applySessionCookie(json({ locale: user.locale }), token);
  } catch (err) {
    logSafeError("account.locale", err);
    return fail("Aktualisierung zurzeit nicht möglich.", 500);
  }
}
