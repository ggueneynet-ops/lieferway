import { NextResponse } from "next/server";
import { getStripe, stripeWebhookSecret } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook nicht konfiguriert." }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signatur fehlt." }, { status: 400 });
  }
  const raw = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }
  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json(result);
  } catch (e) {
    console.error("stripe webhook", event.type, e);
    return NextResponse.json({ error: "Webhook fehlgeschlagen." }, { status: 500 });
  }
}
