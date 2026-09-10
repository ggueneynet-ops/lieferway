"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  items: CartLine[];
};

type Ctx = {
  cart: CartState | null;
  add: (restaurant: Omit<CartState, "items">, line: Omit<CartLine, "quantity">, qty?: number) => boolean;
  setQty: (menuItemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  foodSubtotal: number;
  sheetOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "lw_cart";

function readStoredCart(): CartState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed?.restaurantId || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
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
          const base =
            prev && prev.restaurantId === restaurant.restaurantId
              ? prev
              : { ...restaurant, items: [] };
          const existing = base.items.find((i) => i.menuItemId === line.menuItemId);
          const items = existing
            ? base.items.map((i) =>
                i.menuItemId === line.menuItemId ? { ...i, quantity: i.quantity + qty } : i,
              )
            : [...base.items, { ...line, quantity: qty }];
          return { ...base, items };
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
