import { z } from "zod";
import { authenticate, setSessionCookie, signToken } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("E-Mail und Passwort prüfen.");
  const session = await authenticate(parsed.data.email, parsed.data.password);
  if (!session) return fail("Anmeldung fehlgeschlagen.", 401);
  const token = await signToken(session);
  await setSessionCookie(token);
  return json({ user: session, token });
}
