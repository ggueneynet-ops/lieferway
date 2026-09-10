import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fail, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { bonHtml } from "@/lib/bon";
import { getCopy } from "@/lib/get-locale";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const { id } = await params;
    const { locale } = await getCopy();

    const restaurant =
      session.role === "ADMIN"
        ? await prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" }, select: { id: true, name: true } })
        : await prisma.restaurant.findUnique({ where: { ownerId: session.id }, select: { id: true, name: true } });
    if (!restaurant) return fail("Kein Restaurant.", 403);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { select: { name: true, quantity: true } },
        customer: { select: { name: true, phone: true } },
      },
    });
    if (!order || order.restaurantId !== restaurant.id) return fail("Bestellung nicht gefunden.", 404);

    const html = bonHtml(
      {
        shortCode: order.shortCode,
        restaurantName: restaurant.name,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        totalCents: order.totalCents,
        foodSubtotalCents: order.foodSubtotalCents,
        notes: order.notes,
        street: order.street,
        postalCode: order.postalCode,
        city: order.city,
        prepMinutes: order.prepMinutes,
        items: order.items,
        customer: order.customer,
      },
      locale,
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    return fail("Bon nicht verfügbar.", 500);
  }
}
