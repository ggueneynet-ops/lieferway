import { z } from "zod";
import { fail, json, options } from "@/lib/http";
import { requestPasswordReset } from "@/lib/password-reset";
import { AUTH_RATE, clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/auth";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const limited = rateLimit({
      key: `pwreset-req:${ip}`,
      limit: AUTH_RATE.passwordReset.limit,
      windowMs: AUTH_RATE.passwordReset.windowMs,
    });
    if (!limited.ok) {
      return fail("Zu viele Anfragen. Bitte später erneut versuchen.", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    // Always return the same message — no email enumeration.
    if (parsed.success) {
      await requestPasswordReset(parsed.data.email);
    }
    return json({
      ok: true,
      message: "Wenn ein Konto existiert, wurde eine E-Mail mit dem Reset-Link gesendet.",
    });
  } catch (err) {
    logSafeError("auth.passwordReset.request", err);
    return fail("Anfrage zurzeit nicht möglich. Bitte später erneut versuchen.", 500);
  }
}
