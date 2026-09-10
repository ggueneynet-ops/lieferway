import { SiteHeader } from "@/components/site-header";
import { CartClient } from "@/components/cart-client";

/** Fallback if the sheet is skipped (bookmark / no-JS). Same panel as the bottom sheet. */
export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <CartClient />
    </>
  );
}
