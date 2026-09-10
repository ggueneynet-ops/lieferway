import { prisma } from "@/lib/prisma";

export const kitchenOrderInclude = {
  items: true,
  customer: { select: { name: true, phone: true } },
} as const;

export type KitchenOrder = {
  id: string;
  shortCode: string;
  status: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  notes: string | null;
  prepMinutes: number | null;
  createdAt: string;
  street: string;
  city: string;
  postalCode: string;
  items: { id: string; name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export function serializeKitchenOrder(o: {
  id: string;
  shortCode: string;
  status: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  notes: string | null;
  prepMinutes?: number | null;
  createdAt: Date;
  street: string;
  city: string;
  postalCode: string;
  items: { id: string; name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
}): KitchenOrder {
  return {
    id: o.id,
    shortCode: o.shortCode,
    status: o.status,
    paymentMethod: o.paymentMethod,
    totalCents: o.totalCents,
    foodSubtotalCents: o.foodSubtotalCents,
    notes: o.notes,
    prepMinutes: o.prepMinutes ?? null,
    createdAt: o.createdAt.toISOString(),
    street: o.street,
    city: o.city,
    postalCode: o.postalCode,
    items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
    customer: o.customer,
  };
}

export function kitchenSignature(orders: KitchenOrder[]) {
  return orders.map((o) => `${o.id}:${o.status}:${o.createdAt}`).join("|");
}

export async function resolveKitchenRestaurant(opts: {
  userId: string;
  role: string;
  restaurantId?: string | null;
}) {
  if (opts.role === "ADMIN") {
    if (opts.restaurantId) {
      return prisma.restaurant.findUnique({
        where: { id: opts.restaurantId },
        select: { id: true, name: true, isOpen: true, ownerId: true },
      });
    }
    return prisma.restaurant.findFirst({
      where: { slug: "anadolu-grill" },
      select: { id: true, name: true, isOpen: true, ownerId: true },
    });
  }
  return prisma.restaurant.findUnique({
    where: { ownerId: opts.userId },
    select: { id: true, name: true, isOpen: true, ownerId: true },
  });
}

export async function loadKitchenSnapshot(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, isOpen: true },
  });
  if (!restaurant) return null;
  const [placed, rest] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, status: "PLACED" },
      include: kitchenOrderInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { restaurantId, status: { not: "PLACED" } },
      include: kitchenOrderInclude,
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  const seen = new Set(placed.map((o) => o.id));
  const orders = [...placed, ...rest.filter((o) => !seen.has(o.id))].map(serializeKitchenOrder);
  return {
    restaurant,
    orders,
    incoming: placed.length,
    signature: kitchenSignature(orders),
  };
}
