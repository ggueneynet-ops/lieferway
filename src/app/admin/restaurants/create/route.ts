import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/admin");
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

  const formData = await req.formData();
  const result = await createRestaurantRecord({
    name: String(formData.get("name") ?? ""),
    cuisine: String(formData.get("cuisine") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    commissionPercent: Number(formData.get("commissionPercent") ?? DEFAULT_COMMISSION_PERCENT),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  });

  if ("error" in result) {
    return redirectTo(`/admin/restaurants?error=${encodeURIComponent(result.error)}`);
  }

  return redirectTo(
    `/admin/restaurants?ok=1&name=${encodeURIComponent(result.restaurant.name)}&email=${encodeURIComponent(result.restaurant.owner.email)}`,
  );
}
