import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseHours, serializeHours, WEEKDAYS, type WeekHours } from "@/lib/hours";

function redirectTo() {
  revalidatePath("/restaurant/hours");
  return new NextResponse(null, { status: 303, headers: { Location: "/restaurant/hours?ok=1" } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant =
      session.role === "ADMIN"
        ? await prisma.restaurant.findFirst({ where: { slug: "anadolu-grill" } })
        : await prisma.restaurant.findUnique({ where: { ownerId: session.id } });
    if (!restaurant) return redirectTo();
    const form = await req.formData();
    const hours = parseHours(restaurant.hoursJson);
    const next = { ...hours } as WeekHours;
    for (const d of WEEKDAYS) {
      next[d] = {
        closed: form.get(`closed-${d}`) === "on",
        open: String(form.get(`open-${d}`) ?? hours[d].open),
        close: String(form.get(`close-${d}`) ?? hours[d].close),
      };
    }
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { hoursJson: serializeHours(next) },
    });
    return redirectTo();
  } catch {
    return new NextResponse(null, { status: 303, headers: { Location: "/login?next=/restaurant/hours" } });
  }
}
