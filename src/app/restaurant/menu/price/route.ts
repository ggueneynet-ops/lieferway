import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";

function redirectTo() {
  revalidatePath("/restaurant/menu");
  return new NextResponse(null, { status: 303, headers: { Location: "/restaurant/menu" } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    const priceCents = eurosToCents(String(form.get("price") ?? ""));
    const restaurant =
      session.role === "ADMIN"
        ? await prisma.restaurant.findFirst()
        : await prisma.restaurant.findUnique({ where: { ownerId: session.id } });
    if (!restaurant || !id || priceCents <= 0) return redirectTo();
    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: restaurant.id },
    });
    if (!existing) return redirectTo();
    await prisma.menuItem.update({
      where: { id },
      data: { priceCents },
    });
    return redirectTo();
  } catch {
    return new NextResponse(null, { status: 303, headers: { Location: "/login?next=/restaurant/menu" } });
  }
}
