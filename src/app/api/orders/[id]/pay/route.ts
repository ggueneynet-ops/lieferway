import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createDestinationPaymentIntent } from "@/lib/payments";
import { canAcceptOnlinePayments } from "@/lib/stripe-connect";
import { getStripe, isStripeConfigured, stripePublishableKey } from "@/lib/stripe";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      restaurant: true,
      customer: { select: { email: true } },
    },
  });
  if (!order) return fail("Bestellung nicht gefunden.", 404);
  if (session.role === "CUSTOMER" && order.customerId !== session.id) {
    return fail("Keine Berechtigung.", 403);
  }
  if (order.paymentMethod === "CASH") {
    return json({ cash: true, orderId: order.id });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return json({
      paid: order.paymentStatus === "PAID",
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
  }
  if (!isStripeConfigured() || !canAcceptOnlinePayments(order.restaurant)) {
    return fail("Online-Zahlung für dieses Restaurant ist nicht verfügbar.", 409);
  }

  let clientSecret = "";
  let paymentIntentId = order.stripePaymentIntentId;
  if (paymentIntentId) {
    try {
      const existing = await getStripe().paymentIntents.retrieve(paymentIntentId);
      if (existing.status === "requires_payment_method" || existing.status === "requires_confirmation" || existing.status === "requires_action") {
        clientSecret = existing.client_secret ?? "";
      } else if (existing.status === "succeeded") {
        return json({ paid: true, status: order.status, paymentStatus: order.paymentStatus });
      } else {
        paymentIntentId = null;
      }
    } catch {
      paymentIntentId = null;
    }
  }
  if (!clientSecret) {
    const intent = await createDestinationPaymentIntent({
      amountCents: order.totalCents,
      applicationFeeCents: order.applicationFeeCents,
      destinationAccountId: order.restaurant.stripeAccountId!,
      method: order.paymentMethod as "CARD" | "APPLE_PAY" | "GOOGLE_PAY",
      metadata: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        shortCode: order.shortCode,
      },
      customerEmail: order.customer.email,
    });
    paymentIntentId = intent.id;
    clientSecret = intent.clientSecret;
    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: intent.id, paymentStatus: "PENDING" },
    });
  }

  return json({
    orderId: order.id,
    shortCode: order.shortCode,
    clientSecret,
    paymentIntentId,
    publishableKey: stripePublishableKey(),
    amountCents: order.totalCents,
  });
}
