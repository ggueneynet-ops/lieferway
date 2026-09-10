import { z } from "zod";
import type { Role } from "@/lib/constants";
import { getSession, setSessionCookie, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  phone: z.string().min(6).optional(),
  name: z.string().min(2).max(80).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  if (session.role !== "CUSTOMER" && session.role !== "ADMIN") {
    return fail("Keine Berechtigung.", 403);
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Bitte Name oder Telefon prüfen.");
  const data: { phone?: string; name?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name.trim();
  if (parsed.data.phone) {
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return fail("Bitte eine gültige Nummer angeben, z. B. +49 171 1234567.");
    data.phone = phone;
  }
  if (!data.name && !data.phone) return fail("Bitte Name oder Telefon prüfen.");

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
  });
  await setSessionCookie(
    await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      locale: user.locale,
    }),
  );
  return json({ phone: user.phone, name: user.name });
}
