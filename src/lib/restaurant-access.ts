import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireOwnedRestaurant() {
  const session = await getSession();
  if (!session) redirect("/login?next=/restaurant");
  if (session.role !== "RESTAURANT" && session.role !== "ADMIN") redirect("/");
  const restaurant =
    session.role === "ADMIN"
      ? await prisma.restaurant.findFirst({
          where: { slug: "anadolu-grill" },
        })
      : await prisma.restaurant.findUnique({
          where: { ownerId: session.id },
        });
  if (!restaurant) {
    return { session, restaurant: null as null };
  }
  return { session, restaurant };
}
