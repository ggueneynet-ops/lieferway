"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

export async function createOwnRestaurantAction(formData: FormData) {
  let session;
  try {
    session = await requireSession(["RESTAURANT", "ADMIN"]);
  } catch {
    redirect("/login?next=/restaurant");
  }

  const result = await createRestaurantRecord({
    name: String(formData.get("name") ?? ""),
    cuisine: String(formData.get("cuisine") ?? ""),
    existingOwnerId: session.id,
    commissionPercent: DEFAULT_COMMISSION_PERCENT,
  });

  revalidatePath("/");
  revalidatePath("/restaurant");
  revalidatePath("/restaurant/menu");
  revalidatePath("/admin/restaurants");

  if ("error" in result) {
    redirect(`/restaurant?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/restaurant?ok=1");
}
