import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRestaurantRadius } from "@/lib/radius";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/restaurant/delivery");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const form = await req.formData();
    const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: session.id } });
    const id =
      restaurant?.id ??
      (session.role === "ADMIN" ? String(form.get("id") ?? "") : "");
    if (!id) return redirectTo("/restaurant?error=" + encodeURIComponent("Restaurant nicht gefunden."));

    const maxDeliveryKm = parseRestaurantRadius(String(form.get("maxDeliveryKm") ?? ""));
    await prisma.restaurant.update({
      where: { id },
      data: { maxDeliveryKm },
    });
    return redirectTo("/restaurant/delivery?ok=radius");
  } catch {
    return redirectTo("/login?next=/restaurant");
  }
}
