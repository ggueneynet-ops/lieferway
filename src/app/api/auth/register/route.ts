import { z } from "zod";
import { hashPassword, setSessionCookie, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  locale: z.enum(["de", "en", "tr"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Bitte Name, E-Mail und Passwort (min. 6 Zeichen) angeben.");
  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return fail("Diese E-Mail ist bereits registriert.");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name,
      role: "CUSTOMER",
      locale: parsed.data.locale ?? "de",
    },
  });
  const session = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "CUSTOMER",
    locale: user.locale,
  };
  const token = await signToken(session);
  await setSessionCookie(token);
  return json({ user: session, token }, 201);
}
