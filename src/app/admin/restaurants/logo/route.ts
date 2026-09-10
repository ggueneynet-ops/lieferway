import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseLogoUrl, saveRestaurantLogoFile } from "@/lib/logo-upload";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/suchen");
  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurant");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    return redirectTo("/login?next=/admin/restaurants");
  }

  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  if (!id) {
    return redirectTo("/admin/restaurants?error=" + encodeURIComponent("Restaurant fehlt."));
  }

  const file = form.get("logoFile");
  let logoUrl: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    const saved = await saveRestaurantLogoFile(file, id);
    if (typeof saved !== "string") {
      return redirectTo("/admin/restaurants?error=" + encodeURIComponent("Logo-Datei prüfen (PNG/JPG/WebP, max. 2 MB)."));
    }
    logoUrl = saved;
  } else {
    const parsed = parseLogoUrl(String(form.get("logoUrl") ?? ""));
    if (parsed === "invalid") {
      return redirectTo("/admin/restaurants?error=" + encodeURIComponent("Logo-URL prüfen."));
    }
    logoUrl = parsed;
  }

  await prisma.restaurant.update({
    where: { id },
    data: { logoUrl },
  });
  return redirectTo("/admin/restaurants?ok=logo");
}
