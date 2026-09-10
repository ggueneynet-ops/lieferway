import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/admin/restaurants");
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
  const freeze = String(form.get("freeze") ?? "") === "1";
  if (!id) return redirectTo("/admin/restaurants");
  await prisma.restaurant.update({
    where: { id },
    data: { isActive: !freeze },
  });
  return redirectTo(`/admin/restaurants/${id}`);
}
