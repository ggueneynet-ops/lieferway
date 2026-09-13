import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

function redirectTo(path: string) {
  revalidatePath("/");
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
  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const freeze = String(form.get("freeze") ?? "") === "1";
  if (!id) return redirectTo("/admin/restaurants");
  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: { isActive: !freeze },
    select: { id: true, name: true, isActive: true },
  });
  await writeAuditLog({
    actor: session,
    action: freeze ? "RESTAURANT_FREEZE" : "RESTAURANT_UNFREEZE",
    entityType: "Restaurant",
    entityId: restaurant.id,
    summary: `${freeze ? "Froze" : "Unfroze"} restaurant ${restaurant.name}`,
    metadata: { name: restaurant.name, isActive: restaurant.isActive },
  });
  return redirectTo(`/admin/restaurants/${id}`);
}
