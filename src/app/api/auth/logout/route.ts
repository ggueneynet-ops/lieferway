import { clearSessionCookie } from "@/lib/auth";
import { json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
