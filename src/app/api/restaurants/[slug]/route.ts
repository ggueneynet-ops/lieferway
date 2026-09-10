import { prisma } from "@/lib/prisma";
import { fail, json, options } from "@/lib/http";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!restaurant || !restaurant.isActive) return fail("Restaurant nicht gefunden.", 404);
  return json({
    restaurant: {
      ...restaurant,
      deliveryFeeCents: listedDeliveryFeeCents(restaurant),
    },
  });
}
