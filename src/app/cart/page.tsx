import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartClient } from "@/components/cart-client";

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <CartClient />
      <SiteFooter />
    </>
  );
}
