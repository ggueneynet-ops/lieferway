import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRestaurantRadius } from "@/lib/radius";
import { isAuthFailure } from "@/lib/restaurant-menu-actions";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/restaurant/delivery");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const form = await req.formData();
    const owned =
      session.role === "ADMIN"
        ? null
        : await prisma.restaurant.findUnique({
            where: { ownerId: session.id },
            select: { id: true },
          });
    const id =
      owned?.id ??
      (session.role === "ADMIN" ? String(form.get("id") ?? "") : "");
    if (!id) return redirectTo("/restaurant/delivery?error=" + encodeURIComponent("Restaurant nicht gefunden."));

    const maxDeliveryKm = parseRestaurantRadius(String(form.get("maxDeliveryKm") ?? ""));
    await prisma.restaurant.update({
      where: { id },
      data: { maxDeliveryKm },
    });
    return redirectTo("/restaurant/delivery?ok=radius");
  } catch (error) {
    console.error("[restaurant/radius]", error);
    if (isAuthFailure(error)) {
      return redirectTo("/login?next=/restaurant/delivery");
    }
    return redirectTo("/restaurant/delivery?error=" + encodeURIComponent("Radius konnte nicht gespeichert werden."));
  }
}
