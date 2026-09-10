"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { CartPanel } from "@/components/cart-panel";
import { isStaffArea } from "@/lib/paths";

/** Host on <html>, not <body>: iOS Safari treats position:fixed inside a flex body as document-absolute. */
function overlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById("lw-overlay-root");
  if (existing instanceof HTMLElement) return existing;
  const el = document.createElement("div");
  el.id = "lw-overlay-root";
  el.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:visible;";
  document.documentElement.appendChild(el);
  return el;
}

export function CartSheet() {
  const { sheetOpen, closeCart } = useCart();
  const { t } = useI18n();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const hidden =
    isStaffArea(path) ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/partner") ||
    path.startsWith("/cart");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (hidden && sheetOpen) closeCart();
  }, [hidden, sheetOpen, closeCart]);

  useEffect(() => {
    if (hidden || !sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, sheetOpen, closeCart]);

  if (!mounted || hidden || !sheetOpen) return null;
  const root = overlayRoot();
  if (!root) return null;

  return createPortal(
    <div data-cart-root="" className="lw-cart-overlay">
      <button
        type="button"
        aria-label={t.closeCart}
        onClick={closeCart}
        className="lw-cart-scrim"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lw-cart-title"
        data-cart-sheet="bottom"
        className="lw-cart-drawer"
      >
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-[#D1D5DB]" />
        </div>
        <div className="flex items-start justify-between px-5 pb-1 pt-2">
          <h2 id="lw-cart-title" className="font-display text-xl font-semibold tracking-tight">
            {t.yourOrder}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="touch-manipulation rounded-full px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            {t.close}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <CartPanel onCheckout={closeCart} compact />
        </div>
      </div>
    </div>,
    root,
  );
}
