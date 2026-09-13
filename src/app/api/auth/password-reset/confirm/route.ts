import { z } from "zod";
import { fail, json, options } from "@/lib/http";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { AUTH_RATE, clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/auth";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limited = rateLimit({
      key: `pwreset-confirm:${ip}`,
      limit: AUTH_RATE.passwordReset.limit,
      windowMs: AUTH_RATE.passwordReset.windowMs,
    });
    if (!limited.ok) {
      return fail("Zu viele Anfragen. Bitte später erneut versuchen.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Token und Passwort (min. 6 Zeichen) prüfen.");

    const result = await consumePasswordResetToken({
      rawToken: parsed.data.token,
      newPassword: parsed.data.password,
    });
    if ("error" in result) return fail(result.error, result.status);
    return json({ ok: true, message: "Passwort aktualisiert. Bitte anmelden." });
  } catch (err) {
    logSafeError("auth.passwordReset.confirm", err);
    return fail("Reset zurzeit nicht möglich. Bitte später erneut versuchen.", 500);
  }
}
