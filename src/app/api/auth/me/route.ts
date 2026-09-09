import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Nicht angemeldet.", 401);
  const db = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true },
  });
  return json({ user: { ...session, phone: db?.phone ?? null } });
}
