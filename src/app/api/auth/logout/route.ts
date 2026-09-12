import { applyClearedSessionCookie, logSafeError } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function POST() {
  try {
    return applyClearedSessionCookie(json({ ok: true }));
  } catch (err) {
    logSafeError("auth.logout", err);
    return fail("Abmeldung zurzeit nicht möglich.", 500);
  }
}
