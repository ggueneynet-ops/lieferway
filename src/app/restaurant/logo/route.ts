import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseLogoUrl, saveRestaurantLogoFile } from "@/lib/logo-upload";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/restaurant");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    const restaurant =
      session.role === "ADMIN"
        ? await prisma.restaurant.findUnique({ where: { id } })
        : await prisma.restaurant.findUnique({ where: { ownerId: session.id } });
    if (!restaurant) {
      return redirectTo("/restaurant?error=" + encodeURIComponent("Restaurant nicht gefunden."));
    }

    const file = form.get("logoFile");
    let logoUrl: string | null | undefined;
    if (file instanceof File && file.size > 0) {
      const saved = await saveRestaurantLogoFile(file, restaurant.id);
      if (typeof saved !== "string") {
        return redirectTo("/restaurant?error=" + encodeURIComponent("Logo-Datei prüfen (PNG/JPG/WebP, max. 2 MB)."));
      }
      logoUrl = saved;
    } else {
      const parsed = parseLogoUrl(String(form.get("logoUrl") ?? ""));
      if (parsed === "invalid") {
        return redirectTo("/restaurant?error=" + encodeURIComponent("Logo-URL prüfen."));
      }
      logoUrl = parsed;
    }

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { logoUrl },
    });
    return redirectTo("/restaurant?ok=logo");
  } catch {
    return redirectTo("/login?next=/restaurant");
  }
}
