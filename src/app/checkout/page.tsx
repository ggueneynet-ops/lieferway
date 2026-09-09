"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR } from "@/lib/money";
import { applyCoupon, computeOrderTotals } from "@/lib/orders";
import type { PaymentMethod } from "@/lib/constants";
import { toast } from "sonner";

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "CARD", label: "Kreditkarte", hint: "Visa, Mastercard · Stripe-Mock" },
  { id: "APPLE_PAY", label: "Apple Pay", hint: "Touch ID / Face ID · Mock-Erfolg" },
  { id: "GOOGLE_PAY", label: "Google Pay", hint: "Google-Konto · Mock-Erfolg" },
  { id: "CASH", label: "Bar bei Lieferung", hint: "Provision erscheint separat im Ledger" },
];

export default function CheckoutPage() {
  const { cart, foodSubtotal, clear } = useCart();
  const { t } = useI18n();
  const router = useRouter();
  const [street, setStreet] = useState("Berger Straße 142");
  const [postalCode, setPostalCode] = useState("60316");
  const [city, setCity] = useState("Frankfurt am Main");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{
    code: string;
    discountPercent: number | null;
    discountCents: number | null;
    isActive: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => setAuthed(r.ok));
  }, []);

  if (!cart) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">{t.emptyCart}</p>
          <Button asChild className="mt-4">
            <Link href="/">Zur Startseite</Link>
          </Button>
        </main>
      </>
    );
  }

  const discountCents = applyCoupon(foodSubtotal, coupon);
  const totals = computeOrderTotals({
    foodSubtotalCents: foodSubtotal,
    deliveryFeeCents: cart.deliveryFeeCents,
    discountCents,
    commissionPercent: 5,
  });

  async function applyCode() {
    const res = await fetch(`/api/coupons/${encodeURIComponent(couponCode)}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Ungültig");
      setCoupon(null);
      return;
    }
    setCoupon(data.coupon);
    toast.success(`Gutschein ${data.coupon.code} aktiv`);
  }

  async function pay() {
    const current = cart;
    if (!current) return;
    if (!authed) {
      router.push("/login?next=/checkout");
      return;
    }
    if (foodSubtotal < current.minOrderCents) {
      toast.error("Mindestbestellwert nicht erreicht.");
      return;
    }
    setBusy(true);
    try {
      const payRes = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: totals.totalCents, method, confirm: true }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: current.restaurantId,
          items: current.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          paymentMethod: method,
          paymentIntentId: payData.intent.id,
          street,
          city,
          postalCode,
          notes,
          couponCode: coupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clear();
      toast.success("Bestellung aufgegeben");
      router.push(`/orders/${data.order.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Kasse</h1>
        <p className="text-sm text-muted-foreground">{cart.restaurantName}</p>
        {authed === false && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm">
            Bitte <Link className="font-medium text-primary underline" href="/login?next=/checkout">anmelden</Link>, um zu bestellen.
          </p>
        )}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold">{t.address}</h2>
              <div className="mt-4 grid gap-3">
                <div>
                  <Label>{t.street}</Label>
                  <Input className="mt-1" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.postal}</Label>
                    <Input className="mt-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t.cityField}</Label>
                    <Input className="mt-1" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t.notes}</Label>
                  <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold">Zahlung an Lieferway</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stripe-Mock: Karte / Apple Pay / Google Pay werden als erfolgreich simuliert. Kein PayPal.
              </p>
              <div className="mt-4 grid gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`rounded-xl border px-4 py-3 text-left ${method === m.id ? "border-primary bg-accent" : "hover:bg-muted/50"}`}
                  >
                    <span className="block font-medium">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </button>
                ))}
              </div>
              {method === "CARD" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Label>Kartennummer</Label>
                    <Input className="mt-1" value={card} onChange={(e) => setCard(e.target.value)} />
                  </div>
                  <div>
                    <Label>Gültig bis</Label>
                    <Input className="mt-1" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                  </div>
                  <div>
                    <Label>CVC</Label>
                    <Input className="mt-1" value={cvc} onChange={(e) => setCvc(e.target.value)} />
                  </div>
                </div>
              )}
              {method === "APPLE_PAY" && (
                <div className="mt-4 rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white">
                  Apple Pay · Betrag {formatEUR(totals.totalCents)}
                </div>
              )}
              {method === "GOOGLE_PAY" && (
                <div className="mt-4 rounded-xl border-2 border-zinc-800 px-4 py-3 text-center text-sm font-medium">
                  GPay · {formatEUR(totals.totalCents)}
                </div>
              )}
            </section>
          </div>
          <aside className="h-fit rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Summe</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {cart.items.map((i) => (
                <li key={i.menuItemId} className="flex justify-between gap-2">
                  <span>
                    {i.quantity}× {i.name}
                  </span>
                  <span>{formatEUR(i.priceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="WILLKOMMEN10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={applyCode}>
                {t.apply}
              </Button>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <p className="flex justify-between">
                <span>{t.subtotal}</span>
                <span>{formatEUR(foodSubtotal)}</span>
              </p>
              {discountCents > 0 && (
                <p className="flex justify-between text-emerald-700">
                  <span>{t.discount}</span>
                  <span>−{formatEUR(discountCents)}</span>
                </p>
              )}
              <p className="flex justify-between text-muted-foreground">
                <span>{t.fee}</span>
                <span>{formatEUR(cart.deliveryFeeCents)}</span>
              </p>
              <p className="flex justify-between font-semibold">
                <span>{t.total}</span>
                <span>{formatEUR(totals.totalCents)}</span>
              </p>
            </div>
            <Button className="mt-4 w-full" size="lg" disabled={busy} onClick={pay}>
              {busy ? t.processing : t.payNow}
            </Button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
