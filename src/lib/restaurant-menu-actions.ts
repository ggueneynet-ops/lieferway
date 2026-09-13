import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const restaurantSelect = { id: true, cuisine: true } as const;

export async function findOwnedRestaurantForMenu(userId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.restaurant.findFirst({
      where: { slug: "anadolu-grill" },
      select: restaurantSelect,
    });
  }
  return prisma.restaurant.findUnique({
    where: { ownerId: userId },
    select: restaurantSelect,
  });
}

export function redirectMenu(path = "/restaurant/menu") {
  revalidatePath("/restaurant/menu");
  revalidatePath("/");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export function redirectMenuError(message: string) {
  return redirectMenu(`/restaurant/menu?error=${encodeURIComponent(message)}`);
}

/** Only real auth misses go to login — never Prisma / validation failures. */
export function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN";
}
