import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutClient } from "@/components/checkout-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerNeedsPhone, phoneCapturePath } from "@/lib/phone";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await getSession();
  if (session?.role === "CUSTOMER") {
    const db = await prisma.user.findUnique({
      where: { id: session.id },
      select: { phone: true },
    });
    if (customerNeedsPhone(db?.phone, session.role)) {
      redirect(phoneCapturePath("/checkout"));
    }
  }

  return (
    <>
      <SiteHeader />
      <CheckoutClient />
      <SiteFooter />
    </>
  );
}
