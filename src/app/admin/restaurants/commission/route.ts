import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRestaurantRadius } from "@/lib/radius";

function redirectTo(path: string) {
  revalidatePath("/admin/restaurants");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    return redirectTo("/login?next=/admin/restaurants");
  }

  const formData = await req.formData();
  const id = String(formData.get("id") ?? "");
  const commissionPercent = Number(formData.get("commissionPercent"));
  const maxDeliveryKm = parseRestaurantRadius(String(formData.get("maxDeliveryKm") ?? ""));
  if (!id || !Number.isFinite(commissionPercent)) {
    return redirectTo("/admin/restaurants?error=" + encodeURIComponent("Provision prüfen."));
  }

  await prisma.restaurant.update({
    where: { id },
    data: { commissionPercent, maxDeliveryKm },
  });
  return redirectTo("/admin/restaurants?ok=provision");
}
