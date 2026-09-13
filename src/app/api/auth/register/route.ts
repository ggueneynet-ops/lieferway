import { z } from "zod";
import { applySessionCookie, hashPassword, logSafeError, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { sendUserRegistered } from "@/lib/email";
import { AUTH_RATE, clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().min(6),
  locale: z.enum(["de", "en", "tr"]).optional(),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: `register:${clientIpFromRequest(req)}`,
      limit: AUTH_RATE.register.limit,
      windowMs: AUTH_RATE.register.windowMs,
    });
    if (!limited.ok) return fail("Zu viele Registrierungen. Bitte später erneut versuchen.", 429);
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object" && "role" in body && body.role && body.role !== "CUSTOMER") {
      return fail("Nur Kundinnen und Kunden können sich registrieren.", 403);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Bitte Name, E-Mail, Telefon und Passwort (min. 6 Zeichen) angeben.");
    const email = parsed.data.email.toLowerCase().trim();
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return fail("Bitte eine gültige Telefonnummer angeben, z. B. +49 171 1234567.");
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return fail("Diese E-Mail ist bereits registriert.");
    // Customers only — restaurant/courier/admin accounts are created by admin.
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(parsed.data.password),
        name: parsed.data.name,
        phone,
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
    try {
      await sendUserRegistered({
        userId: user.id,
        email: user.email,
        name: user.name,
        locale: (user.locale === "en" || user.locale === "tr" ? user.locale : "de"),
      });
    } catch (mailErr) {
      console.error("auth.register.email", mailErr);
    }
    return applySessionCookie(json({ user: session, token }, 201), token);
  } catch (err) {
    logSafeError("auth.register", err);
    return fail("Registrierung zurzeit nicht möglich. Bitte später erneut versuchen.", 500);
  }
}
