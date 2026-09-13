import { prisma } from "@/lib/prisma";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";

export type ReorderLineOk = {
  status: "ok";
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl: string | null;
  previousPriceCents: number;
  priceChanged: boolean;
};

export type ReorderLineIssue = {
  status: "removed" | "sold_out" | "price_changed";
  menuItemId: string;
  name: string;
  quantity: number;
  previousPriceCents: number;
  priceCents?: number;
  imageUrl?: string | null;
};

export type ReorderPreview = {
  ok: boolean;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    minOrderCents: number;
    listedDeliveryFeeCents: number;
    pickupAllowed: boolean;
    restaurantAddress: string;
    restaurantCity: string;
    restaurantPostalCode: string;
    etaMin: number;
    isActive: boolean;
    isOpen: boolean;
  } | null;
  lines: Array<ReorderLineOk | ReorderLineIssue>;
  messages: string[];
  addable: ReorderLineOk[];
};

export async function buildReorderPreview(opts: {
  orderId: string;
  customerId: string;
  isAdmin?: boolean;
}): Promise<ReorderPreview | { error: string; status: number }> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      items: true,
      restaurant: true,
    },
  });
  if (!order) return { error: "Bestellung nicht gefunden.", status: 404 };
  if (!opts.isAdmin && order.customerId !== opts.customerId) {
    return { error: "Keine Berechtigung.", status: 403 };
  }

  const restaurant = order.restaurant;
  const menuIds = order.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuIds }, restaurantId: restaurant.id },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines: Array<ReorderLineOk | ReorderLineIssue> = [];
  const messages: string[] = [];

  for (const item of order.items) {
    const current = byId.get(item.menuItemId);
    if (!current) {
      lines.push({
        status: "removed",
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        previousPriceCents: item.priceCents,
      });
      messages.push(`„${item.name}“ ist nicht mehr im Menü.`);
      continue;
    }
    if (!current.isAvailable) {
      lines.push({
        status: "sold_out",
        menuItemId: current.id,
        name: current.name,
        quantity: item.quantity,
        previousPriceCents: item.priceCents,
        priceCents: current.priceCents,
        imageUrl: current.imageUrl,
      });
      messages.push(`„${current.name}“ ist ausverkauft.`);
      continue;
    }
    const priceChanged = current.priceCents !== item.priceCents;
    if (priceChanged) {
      messages.push(
        `„${current.name}“: Preis aktualisiert (${(item.priceCents / 100).toFixed(2)} → ${(current.priceCents / 100).toFixed(2)} €).`,
      );
    }
    lines.push({
      status: "ok",
      menuItemId: current.id,
      name: current.name,
      priceCents: current.priceCents,
      quantity: item.quantity,
      imageUrl: current.imageUrl,
      previousPriceCents: item.priceCents,
      priceChanged,
    });
  }

  const addable = lines.filter((l): l is ReorderLineOk => l.status === "ok");
  if (!restaurant.isActive) {
    messages.push("Dieses Restaurant ist derzeit nicht verfügbar.");
  }

  return {
    ok: addable.length > 0 && restaurant.isActive,
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      minOrderCents: restaurant.minOrderCents,
      listedDeliveryFeeCents: listedDeliveryFeeCents(restaurant),
      pickupAllowed: restaurant.pickupAllowed !== false,
      restaurantAddress: restaurant.address,
      restaurantCity: restaurant.city,
      restaurantPostalCode: restaurant.postalCode,
      etaMin: restaurant.etaMin,
      isActive: restaurant.isActive,
      isOpen: restaurant.isOpen,
    },
    lines,
    messages,
    addable,
  };
}
