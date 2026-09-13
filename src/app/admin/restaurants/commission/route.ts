import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRestaurantRadius } from "@/lib/radius";
import { writeAuditLog } from "@/lib/audit";

function redirectTo(path: string) {
  revalidatePath("/admin/restaurants");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  let session: SessionUser;
  try {
    session = await requireSession(["ADMIN"]);
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

  const before = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, commissionPercent: true, maxDeliveryKm: true },
  });
  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: { commissionPercent, maxDeliveryKm },
    select: { id: true, name: true, commissionPercent: true, maxDeliveryKm: true },
  });
  await writeAuditLog({
    actor: session,
    action: "COMMISSION_UPDATE",
    entityType: "Restaurant",
    entityId: restaurant.id,
    summary: `Commission ${before?.commissionPercent ?? "?"}→${restaurant.commissionPercent}% for ${restaurant.name}`,
    metadata: {
      name: restaurant.name,
      before: before
        ? { commissionPercent: before.commissionPercent, maxDeliveryKm: before.maxDeliveryKm }
        : null,
      after: {
        commissionPercent: restaurant.commissionPercent,
        maxDeliveryKm: restaurant.maxDeliveryKm,
      },
    },
  });
  return redirectTo("/admin/restaurants?ok=provision");
}
