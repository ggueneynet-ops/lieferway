import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  try {
    const session = await requireSession(["COURIER", "ADMIN"]);
    const orders = await prisma.order.findMany({
      where:
        session.role === "ADMIN"
          ? { status: { in: ["READY", "OUT_FOR_DELIVERY"] } }
          : {
              OR: [
                { courierId: session.id, status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
                { status: "READY", courierId: null },
              ],
            },
      include: {
        items: true,
        restaurant: { select: { name: true, address: true, postalCode: true, city: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return json({ orders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
