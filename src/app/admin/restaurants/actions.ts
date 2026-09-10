"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";
import { parseSlugInput } from "@/lib/slug";

function finish(path: string): never {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurant");
  redirect(path);
}

export async function createRestaurantAction(formData: FormData) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    redirect("/login?next=/admin/restaurants");
  }

  const result = await createRestaurantRecord({
    name: String(formData.get("name") ?? ""),
    cuisine: String(formData.get("cuisine") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    commissionPercent: Number(formData.get("commissionPercent") ?? DEFAULT_COMMISSION_PERCENT),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  });

  if ("error" in result) {
    finish(`/admin/restaurants?error=${encodeURIComponent(result.error)}`);
  }

  finish(
    `/admin/restaurants?ok=1&name=${encodeURIComponent(result.restaurant.name)}&email=${encodeURIComponent(result.restaurant.owner.email)}`,
  );
}

export async function updateCommissionAction(formData: FormData) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    redirect("/login?next=/admin/restaurants");
  }

  const id = String(formData.get("id") ?? "");
  const commissionPercent = Number(formData.get("commissionPercent"));
  if (!id || !Number.isFinite(commissionPercent)) {
    finish("/admin/restaurants?error=" + encodeURIComponent("Provision prüfen."));
  }

  await prisma.restaurant.update({
    where: { id },
    data: { commissionPercent },
  });
  finish("/admin/restaurants?ok=provision");
}

export async function updateSlugAction(formData: FormData) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    redirect("/login?next=/admin/restaurants");
  }

  const id = String(formData.get("id") ?? "");
  const parsed = parseSlugInput(String(formData.get("slug") ?? ""));
  if (!id) {
    finish("/admin/restaurants?error=" + encodeURIComponent("Restaurant fehlt."));
  }
  if (!parsed) {
    finish("/admin/restaurants?error=" + encodeURIComponent("Bitte einen gültigen Slug (klein, Bindestriche)."));
  }

  const current = await prisma.restaurant.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!current) {
    finish("/admin/restaurants?error=" + encodeURIComponent("Restaurant nicht gefunden."));
  }

  const clash = await prisma.restaurant.findUnique({ where: { slug: parsed }, select: { id: true } });
  if (clash && clash.id !== id) {
    finish("/admin/restaurants?error=" + encodeURIComponent("Dieser Slug ist schon vergeben."));
  }

  await prisma.restaurant.update({
    where: { id },
    data: { slug: parsed },
  });
  revalidatePath(`/${current.slug}`);
  revalidatePath(`/restaurants/${current.slug}`);
  revalidatePath(`/${parsed}`);
  revalidatePath(`/restaurants/${parsed}`);
  finish("/admin/restaurants?ok=slug");
}
