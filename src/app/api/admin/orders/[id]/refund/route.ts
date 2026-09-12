import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { applyRefundToOrder } from "@/lib/stripe-webhooks";
import { remainingOrderTotals } from "@/lib/stripe-money";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  amountCents: z.number().int().positive().optional(),
  full: z.boolean().optional(),
  reason: z.enum(["requested_by_customer", "duplicate", "fraudulent"]).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) return fail("Ungültige Erstattung.");
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return fail("Bestellung nicht gefunden.", 404);
    if (order.paymentMethod === "CASH") return fail("Barzahlungen werden nicht über Stripe erstattet.");
    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED" && order.paymentStatus !== "DISPUTED") {
      return fail("Diese Bestellung ist nicht erstattungsfähig.");
    }
    const remaining = remainingOrderTotals(order);
    if (remaining.remainingTotalCents <= 0) return fail("Bereits vollständig erstattet.");
    const amount = parsed.data.full || !parsed.data.amountCents
      ? remaining.remainingTotalCents
      : parsed.data.amountCents;
    if (amount > remaining.remainingTotalCents) return fail("Betrag übersteigt den Restbetrag.");
    if (!order.stripePaymentIntentId || !isStripeConfigured()) {
      return fail("Keine Stripe-Zahlung zu dieser Bestellung.");
    }

    const refund = await getStripe().refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount,
      reason: parsed.data.reason,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    const result = await applyRefundToOrder({
      orderId: order.id,
      stripeRefundId: refund.id,
      amountCents: refund.amount,
      status: refund.status ?? "succeeded",
      reason: refund.reason,
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { refunds: true },
    });
    return json({ refund, order: updated, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("admin refund", e);
    return fail(e instanceof Error ? e.message : "Erstattung fehlgeschlagen.", 500);
  }
}
