import { prisma } from "@/lib/prisma";
import { json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const cuisine = searchParams.get("cuisine")?.trim() ?? "";

  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(cuisine ? { cuisine } : {}),
    },
    orderBy: { rating: "desc" },
  });

  const filtered = q
    ? restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      )
    : restaurants;

  return json({ restaurants: filtered });
}
