import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  if (session.role !== "CUSTOMER" && session.role !== "ADMIN") {
    return json({ notices: [] });
  }

  const notices = await prisma.customerNotice.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return json({ notices });
}
