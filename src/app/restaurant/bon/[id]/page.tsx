import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { bonHtml, buildBonOrder } from "@/lib/bon";
import { BonPrintFrame } from "@/components/bon-print-frame";

export const dynamic = "force-dynamic";

export default async function RestaurantBonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  if (!restaurant) notFound();
  const { id } = await params;
  const { locale } = await getCopy();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { name: true, quantity: true } },
      customer: { select: { name: true, phone: true } },
      restaurant: { select: { id: true, name: true, logoUrl: true, slug: true } },
    },
  });
  if (!order || order.restaurantId !== restaurant.id) notFound();

  const html = bonHtml(
    await buildBonOrder(order.restaurant, {
      shortCode: order.shortCode,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      totalCents: order.totalCents,
      foodSubtotalCents: order.foodSubtotalCents,
      notes: order.notes,
      street: order.street,
      postalCode: order.postalCode,
      city: order.city,
      prepMinutes: order.prepMinutes,
      fulfillmentType: order.fulfillmentType,
      items: order.items,
      customer: order.customer,
    }),
    locale,
  );

  return <BonPrintFrame html={html} />;
}
