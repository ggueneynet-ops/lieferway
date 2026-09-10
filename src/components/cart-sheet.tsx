"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { CartPanel } from "@/components/cart-panel";
import { isStaffArea } from "@/lib/paths";

export function CartSheet() {
  const { sheetOpen, closeCart } = useCart();
  const { t } = useI18n();
  const path = usePathname();
  const hidden =
    isStaffArea(path) ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/partner") ||
    path.startsWith("/cart");

  useEffect(() => {
    if (hidden || !sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [hidden, sheetOpen, closeCart]);

  if (hidden) return null;

  return (
    <div className={sheetOpen ? "pointer-events-auto" : "pointer-events-none"} aria-hidden={!sheetOpen}>
      <button
        type="button"
        tabIndex={sheetOpen ? 0 : -1}
        aria-label={t.closeCart}
        onClick={closeCart}
        className={`fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300 ${
          sheetOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lw-cart-title"
        data-cart-sheet="bottom"
        className={`fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-[28px] bg-white shadow-[0_-16px_48px_rgba(17,24,39,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
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
            className="rounded-full px-2 py-1 text-sm text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            {t.close}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <CartPanel onCheckout={closeCart} compact />
        </div>
      </div>
    </div>
  );
}
