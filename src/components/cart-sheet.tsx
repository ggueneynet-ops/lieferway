"use client";

import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { CartPanel } from "@/components/cart-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isStaffArea } from "@/lib/paths";

export function CartSheet() {
  const { sheetOpen, closeCart } = useCart();
  const { t } = useI18n();
  const path = usePathname();

  if (isStaffArea(path) || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/partner")) {
    return null;
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => (!open ? closeCart() : undefined)}>
      <SheetContent
        side="bottom"
        className="h-[min(90vh,40rem)] gap-0 rounded-t-[28px] border-[#E5E7EB] p-0 sm:mx-auto sm:max-w-lg"
      >
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
        </div>
        <SheetHeader className="px-5 pb-1 pt-2">
          <SheetTitle className="font-display text-xl font-semibold tracking-tight">{t.yourOrder}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <CartPanel onCheckout={closeCart} compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
