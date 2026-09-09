import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

function redirectTo(path: string) {
  revalidatePath("/");
  revalidatePath("/restaurant");
  revalidatePath("/restaurant/menu");
  revalidatePath("/admin/restaurants");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const formData = await req.formData();
    const result = await createRestaurantRecord({
      name: String(formData.get("name") ?? ""),
      cuisine: String(formData.get("cuisine") ?? ""),
      existingOwnerId: session.id,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
    });

    if ("error" in result) {
      return redirectTo(`/restaurant?error=${encodeURIComponent(result.error)}`);
    }

    return redirectTo("/restaurant?ok=1");
  } catch {
    return redirectTo("/login?next=/restaurant");
  }
}
