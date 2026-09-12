import { z } from "zod";
import { fail, json, options } from "@/lib/http";
import { PAYMENT_METHODS } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { isStripeConfigured, stripePublishableKey } from "@/lib/stripe";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(PAYMENT_METHODS),
  confirm: z.boolean().optional(),
});

/** Online PaymentIntents are created with the order (destination charge). */
export async function POST(req: Request) {
  try {
    await requireSession(["CUSTOMER", "ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Ungültige Zahlungsdaten.");
    if (parsed.data.method === "CASH") {
      return json({
        intent: {
          id: `cash_${crypto.randomUUID().slice(0, 8)}`,
          clientSecret: "",
          amountCents: parsed.data.amountCents,
          currency: "eur",
          method: "CASH",
          status: "cash",
          provider: "stripe",
        },
      });
    }
    if (!isStripeConfigured()) {
      return fail("Stripe Test Mode ist nicht konfiguriert. Bitte über die Kasse bestellen.");
    }
    return json({
      publishableKey: stripePublishableKey(),
      error:
        "Kartenzahlung läuft über die Bestellung (Payment Element). POST /api/orders erzeugt das PaymentIntent.",
      requiresOrder: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}
