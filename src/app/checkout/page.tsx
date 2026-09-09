import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutClient } from "@/components/checkout-client";

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <CheckoutClient />
      <SiteFooter />
    </>
  );
}
