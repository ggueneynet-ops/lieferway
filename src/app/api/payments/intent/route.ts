import { z } from "zod";
import { confirmMockPayment, createMockPaymentIntent } from "@/lib/payments";
import { fail, json, options } from "@/lib/http";
import { PAYMENT_METHODS } from "@/lib/constants";

export async function OPTIONS() {
  return options();
}

const schema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(PAYMENT_METHODS),
  confirm: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ungültige Zahlungsdaten.");
  let intent = createMockPaymentIntent({
    amountCents: parsed.data.amountCents,
    method: parsed.data.method,
  });
  if (parsed.data.confirm !== false) {
    intent = confirmMockPayment(intent);
  }
  return json({ intent });
}
