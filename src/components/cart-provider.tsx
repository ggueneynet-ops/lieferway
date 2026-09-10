"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FulfillmentType } from "@/lib/constants";
import { parseFulfillment, readClientFulfillment } from "@/lib/fulfillment";

export type CartLine = {
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
};

export type CartState = {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  minOrderCents: number;
  deliveryFeeCents: number;
  listedDeliveryFeeCents: number;
  fulfillmentType: FulfillmentType;
  pickupAllowed: boolean;
  restaurantAddress: string;
  restaurantCity: string;
  restaurantPostalCode: string;
  etaMin: number;
  items: CartLine[];
};

export type CartRestaurant = Omit<CartState, "items" | "deliveryFeeCents" | "fulfillmentType"> & {
  deliveryFeeCents?: number;
  fulfillmentType?: FulfillmentType;
};

type FulfillmentMeta = {
  restaurantId: string;
  pickupAllowed: boolean;
  listedDeliveryFeeCents: number;
  restaurantAddress: string;
  restaurantCity: string;
  restaurantPostalCode: string;
  etaMin: number;
};

type Ctx = {
  cart: CartState | null;
  add: (restaurant: CartRestaurant, line: Omit<CartLine, "quantity">, qty?: number) => boolean;
  setQty: (menuItemId: string, qty: number) => void;
  setFulfillment: (type: FulfillmentType, meta?: FulfillmentMeta) => void;
  clear: () => void;
  count: number;
  foodSubtotal: number;
  sheetOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "lw_cart";

function preferredFulfillment(restaurantId: string, pickupAllowed: boolean): FulfillmentType {
  if (!pickupAllowed) return "DELIVERY";
  return readClientFulfillment(restaurantId);
}

function withFee(cart: Omit<CartState, "deliveryFeeCents">): CartState {
  const pickup = cart.fulfillmentType === "PICKUP" && cart.pickupAllowed;
  return {
    ...cart,
    fulfillmentType: pickup ? "PICKUP" : "DELIVERY",
    deliveryFeeCents: pickup ? 0 : cart.listedDeliveryFeeCents,
  };
}

function normalizeCart(parsed: Partial<CartState> & { restaurantId?: string; items?: CartLine[] }): CartState | null {
  if (!parsed?.restaurantId || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
  const listed =
    typeof parsed.listedDeliveryFeeCents === "number"
      ? parsed.listedDeliveryFeeCents
      : typeof parsed.deliveryFeeCents === "number"
        ? parsed.deliveryFeeCents
        : 0;
  const pickupAllowed = Boolean(parsed.pickupAllowed);
  const fulfillmentType = pickupAllowed ? parseFulfillment(parsed.fulfillmentType) : "DELIVERY";
  return withFee({
    restaurantId: parsed.restaurantId,
    restaurantSlug: parsed.restaurantSlug ?? "",
    restaurantName: parsed.restaurantName ?? "",
    minOrderCents: parsed.minOrderCents ?? 0,
    listedDeliveryFeeCents: listed,
    fulfillmentType,
    pickupAllowed,
    restaurantAddress: parsed.restaurantAddress ?? "",
    restaurantCity: parsed.restaurantCity ?? "",
    restaurantPostalCode: parsed.restaurantPostalCode ?? "",
    etaMin: parsed.etaMin ?? 25,
    items: parsed.items,
  });
}

function readStoredCart(): CartState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeCart(JSON.parse(raw) as CartState);
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setCart((prev) => prev ?? readStoredCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (cart) window.localStorage.setItem(KEY, JSON.stringify(cart));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* Safari private mode / quota — keep in-memory cart */
    }
  }, [cart, ready]);

  const api = useMemo<Ctx>(() => {
    const foodSubtotal = cart?.items.reduce((s, i) => s + i.priceCents * i.quantity, 0) ?? 0;
    const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
    return {
      cart,
      count,
      foodSubtotal,
      add: (restaurant, line, qty = 1) => {
        let replaced = false;
        setCart((prev) => {
          if (prev && prev.restaurantId !== restaurant.restaurantId) {
            replaced = true;
          }
          const same = prev && prev.restaurantId === restaurant.restaurantId;
          const fulfillmentType = same
            ? prev.fulfillmentType
            : preferredFulfillment(restaurant.restaurantId, restaurant.pickupAllowed);
          const base = same
            ? prev
            : withFee({
                ...restaurant,
                listedDeliveryFeeCents: restaurant.listedDeliveryFeeCents,
                fulfillmentType,
                items: [],
              });
          const existing = base.items.find((i) => i.menuItemId === line.menuItemId);
          const items = existing
            ? base.items.map((i) =>
                i.menuItemId === line.menuItemId ? { ...i, quantity: i.quantity + qty } : i,
              )
            : [...base.items, { ...line, quantity: qty }];
          return withFee({
            ...base,
            pickupAllowed: restaurant.pickupAllowed,
            listedDeliveryFeeCents: restaurant.listedDeliveryFeeCents,
            restaurantAddress: restaurant.restaurantAddress,
            restaurantCity: restaurant.restaurantCity,
            restaurantPostalCode: restaurant.restaurantPostalCode,
            etaMin: restaurant.etaMin,
            minOrderCents: restaurant.minOrderCents,
            items,
          });
        });
        setSheetOpen(true);
        return !replaced;
      },
      setQty: (menuItemId, qty) => {
        setCart((prev) => {
          if (!prev) return prev;
          const items =
            qty <= 0
              ? prev.items.filter((i) => i.menuItemId !== menuItemId)
              : prev.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: qty } : i));
          if (items.length === 0) return null;
          return { ...prev, items };
        });
      },
      setFulfillment: (type, meta) => {
        setCart((prev) => {
          if (!prev) return prev;
          if (meta && meta.restaurantId !== prev.restaurantId) return prev;
          const pickupAllowed = meta?.pickupAllowed ?? prev.pickupAllowed;
          const nextType = pickupAllowed ? parseFulfillment(type) : "DELIVERY";
          return withFee({
            ...prev,
            pickupAllowed,
            listedDeliveryFeeCents: meta?.listedDeliveryFeeCents ?? prev.listedDeliveryFeeCents,
            restaurantAddress: meta?.restaurantAddress ?? prev.restaurantAddress,
            restaurantCity: meta?.restaurantCity ?? prev.restaurantCity,
            restaurantPostalCode: meta?.restaurantPostalCode ?? prev.restaurantPostalCode,
            etaMin: meta?.etaMin ?? prev.etaMin,
            fulfillmentType: nextType,
          });
        });
      },
      clear: () => setCart(null),
      sheetOpen,
      openCart: () => setSheetOpen(true),
      closeCart: () => setSheetOpen(false),
    };
  }, [cart, sheetOpen]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart");
  return ctx;
}
