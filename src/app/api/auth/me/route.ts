import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Nicht angemeldet.", 401);
  return json({ user: session });
}
