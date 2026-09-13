import { z } from "zod";
import { applySessionCookie, authenticate, logSafeError, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { withPhoneGate } from "@/lib/phone";
import { AUTH_RATE, clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: `login:${clientIpFromRequest(req)}`,
      limit: AUTH_RATE.login.limit,
      windowMs: AUTH_RATE.login.windowMs,
    });
    if (!limited.ok) return fail("Zu viele Anmeldeversuche. Bitte später erneut versuchen.", 429);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("E-Mail und Passwort prüfen.");
    const session = await authenticate(parsed.data.email, parsed.data.password);
    if (!session) return fail("Anmeldung fehlgeschlagen.", 401);
    const token = await signToken(session);
    const db = await prisma.user.findUnique({
      where: { id: session.id },
      select: { phone: true, role: true },
    });
    return applySessionCookie(
      json({
        user: { ...session, phone: db?.phone ?? null },
        token,
        next: withPhoneGate("/", db?.phone, db?.role ?? session.role),
      }),
      token,
    );
  } catch (err) {
    logSafeError("auth.login", err);
    return fail("Anmeldung zurzeit nicht möglich. Bitte später erneut versuchen.", 500);
  }
}
