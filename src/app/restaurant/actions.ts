"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

/** Kept so old forms cannot create a venue. Admin uses /admin/restaurants/create. */
export async function createOwnRestaurantAction() {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    redirect("/login?next=/restaurant");
  }
  redirect("/admin/restaurants");
}
