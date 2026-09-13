import { prisma } from "@/lib/prisma";

/** Relation include for accept/update paths that still load a full Order row. */
export const kitchenOrderInclude = {
  items: true,
  customer: { select: { name: true, phone: true } },
} as const;

/**
 * Kitchen board only needs these scalars. A full `include` SELECT would also
 * pull recent columns (idempotencyKey, scheduledFor, waypoints*, refunded*)
 * and SSR-crash if production is one migration behind.
 */
export const kitchenOrderSelect = {
  id: true,
  shortCode: true,
  status: true,
  paymentMethod: true,
  totalCents: true,
  foodSubtotalCents: true,
  notes: true,
  prepMinutes: true,
  createdAt: true,
  street: true,
  city: true,
  postalCode: true,
  fulfillmentType: true,
  items: { select: { id: true, name: true, quantity: true } },
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
  fulfillmentType: string;
  items: { id: string; name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export type KitchenSnapshot = {
  restaurant: { id: string; name: string; isOpen: boolean };
  orders: KitchenOrder[];
  incoming: number;
  signature: string;
  error?: boolean;
};

type KitchenOrderInput = {
  id: string;
  shortCode?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  totalCents?: number | null;
  foodSubtotalCents?: number | null;
  notes?: string | null;
  prepMinutes?: number | null;
  createdAt?: Date | string | null;
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  fulfillmentType?: string | null;
  items?: { id: string; name: string; quantity: number }[] | null;
  customer?: { name?: string | null; phone?: string | null } | null;
};

function createdAtIso(value: Date | string | null | undefined): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export function serializeKitchenOrder(o: KitchenOrderInput): KitchenOrder {
  return {
    id: o.id,
    shortCode: o.shortCode || "—",
    status: o.status || "PLACED",
    paymentMethod: o.paymentMethod || "CASH",
    totalCents: o.totalCents ?? 0,
    foodSubtotalCents: o.foodSubtotalCents ?? 0,
    notes: o.notes ?? null,
    prepMinutes: o.prepMinutes ?? null,
    createdAt: createdAtIso(o.createdAt),
    street: o.street ?? "",
    city: o.city ?? "",
    postalCode: o.postalCode ?? "",
    fulfillmentType: o.fulfillmentType === "PICKUP" ? "PICKUP" : "DELIVERY",
    items: (o.items ?? []).map((i) => ({ id: i.id, name: i.name, quantity: i.quantity })),
    customer: { name: o.customer?.name ?? "—", phone: o.customer?.phone ?? null },
  };
}

export function kitchenSignature(orders: KitchenOrder[]) {
  return orders.map((o) => `${o.id}:${o.status}:${o.prepMinutes ?? ""}:${o.createdAt}`).join("|");
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

export async function loadKitchenSnapshot(restaurantId: string): Promise<KitchenSnapshot | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, isOpen: true },
  });
  if (!restaurant) return null;
  try {
    const [placed, rest] = await Promise.all([
      prisma.order.findMany({
        where: { restaurantId, status: "PLACED" },
        select: kitchenOrderSelect,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: { restaurantId, status: { notIn: ["PLACED", "PENDING_PAYMENT"] } },
        select: kitchenOrderSelect,
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
  } catch (error) {
    console.error("[kitchen] loadKitchenSnapshot failed", error);
    return {
      restaurant,
      orders: [],
      incoming: 0,
      signature: "",
      error: true,
    };
  }
}
