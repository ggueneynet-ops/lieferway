"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEUR } from "@/lib/money";
import { applyCoupon, computeOrderTotals, couponBelowMinimum } from "@/lib/orders";
import type { PaymentMethod } from "@/lib/constants";
import { interpolate } from "@/lib/i18n";
import { customerNeedsPhone } from "@/lib/phone";
import { toast } from "sonner";
import { PaymentPicker } from "@/components/payment-picker";
import { QtyStepper } from "@/components/cart-panel";
import { FulfillmentToggle } from "@/components/fulfillment-toggle";
import { isPickup } from "@/lib/fulfillment";

export function CheckoutClient() {
  const { cart, foodSubtotal, clear, setQty, setFulfillment } = useCart();
  const { t, locale } = useI18n();
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
    minSubtotalCents: number | null;
    isActive: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        setAuthed(r.ok);
        if (!r.ok) return;
        const data = (await r.json()) as {
          user?: { phone?: string | null; role?: string; name?: string | null };
        };
        const number = data.user?.phone ?? "";
        setPhone(number);
        if (data.user?.name?.trim()) setFullName(data.user.name.trim());
        if (customerNeedsPhone(number, data.user?.role)) {
          router.replace("/account/phone?next=/checkout");
        }
      })
      .catch(() => setAuthed(false));
    const match = document.cookie.match(/(?:^|; )lw_plz=(\d{5})/);
    if (match?.[1]) setPostalCode(match[1]);
    const streetCk = document.cookie.match(/(?:^|; )lw_street=([^;]*)/);
    if (streetCk?.[1]) setStreet(decodeURIComponent(streetCk[1]));
    const cityCk = document.cookie.match(/(?:^|; )lw_city=([^;]*)/);
    if (cityCk?.[1]) setCity(decodeURIComponent(cityCk[1]));
  }, [router]);

  if (!cart) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center">
        <p className="text-muted-foreground">{t.emptyCart}</p>
        <Button asChild className="mt-4">
          <Link href="/">{t.toHome}</Link>
        </Button>
      </main>
    );
  }

  const discountCents = applyCoupon(foodSubtotal, coupon);
  const couponBlocked = couponBelowMinimum(foodSubtotal, coupon);
  const pickup = isPickup(cart.fulfillmentType) && cart.pickupAllowed;
  const totals = computeOrderTotals({
    foodSubtotalCents: foodSubtotal,
    deliveryFeeCents: pickup ? 0 : cart.deliveryFeeCents,
    discountCents,
    commissionPercent: 5,
  });

  async function applyCode(raw?: string) {
    const code = (raw ?? couponCode).trim().toUpperCase();
    if (!code) {
      toast.error(t.couponInvalid);
      return;
    }
    setCouponCode(code);
    const res = await fetch(`/api/coupons/${encodeURIComponent(code)}?subtotal=${foodSubtotal}`);
    const data = await res.json();
    if (!res.ok) {
      setCoupon(null);
      if (data.error === "min_not_met") {
        toast.error(
          interpolate(t.couponMinNotMet, {
            code: data.coupon?.code ?? code,
            min: formatEUR(data.minSubtotalCents ?? 0, locale),
          }),
        );
        return;
      }
      toast.error(data.error ?? t.couponInvalid);
      return;
    }
    setCoupon(data.coupon);
    toast.success(interpolate(t.couponActive, { code: data.coupon.code }));
  }

  async function pay() {
    const current = cart;
    if (!current) return;
    if (!authed) {
      router.push("/login?next=/checkout");
      return;
    }
    if (customerNeedsPhone(phone, "CUSTOMER")) {
      router.replace("/account/phone?next=/checkout");
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error(t.nameRequired);
      return;
    }
    const pickup = isPickup(current.fulfillmentType) && current.pickupAllowed;
    if (!pickup) {
      if (street.trim().length < 3 || postalCode.trim().length < 4 || city.trim().length < 2) {
        toast.error(t.address);
        return;
      }
    }
    if (foodSubtotal < current.minOrderCents) {
      toast.error(t.minNotMet);
      return;
    }
    setBusy(true);
    try {
      let paymentIntentId: string | undefined;
      if (method !== "CASH") {
        const payRes = await fetch("/api/payments/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents: totals.totalCents, method, confirm: true }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error);
        paymentIntentId = payData.intent.id;
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: current.restaurantId,
          items: current.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          paymentMethod: method,
          paymentIntentId,
          customerName: fullName.trim(),
          street: pickup ? current.restaurantAddress || street : street,
          city: pickup ? current.restaurantCity || city : city,
          postalCode: pickup ? current.restaurantPostalCode || postalCode : postalCode,
          notes,
          couponCode: coupon && !couponBlocked ? coupon.code : undefined,
          fulfillmentType: pickup ? "PICKUP" : "DELIVERY",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clear();
      router.push(`/orders/${data.order.id}`);
      toast.success(t.orderPlaced);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lw-flow-enter mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t.checkoutTitle}</h1>
        <p className="text-sm text-muted-foreground">{cart.restaurantName}</p>
        {authed === false && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm">
            <Link className="font-medium text-primary underline" href="/login?next=/checkout">
              {t.login}
            </Link>
            {" — "}
            {t.loginToOrder}
          </p>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
          <div className="space-y-5">
            <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {pickup ? t.contactPickupSection : t.address}
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">{pickup ? t.pickupHint : t.contactSection}</p>
              {cart.pickupAllowed ? (
                <div className="mt-4">
                  <FulfillmentToggle
                    pickupAllowed
                    value={pickup ? "PICKUP" : "DELIVERY"}
                    onChange={(next) =>
                      setFulfillment(next, {
                        restaurantId: cart.restaurantId,
                        pickupAllowed: cart.pickupAllowed,
                        listedDeliveryFeeCents: cart.listedDeliveryFeeCents,
                        restaurantAddress: cart.restaurantAddress,
                        restaurantCity: cart.restaurantCity,
                        restaurantPostalCode: cart.restaurantPostalCode,
                        etaMin: cart.etaMin,
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="mt-4 grid gap-3">
                <div>
                  <Label htmlFor="checkout-name">
                    {t.fullName} <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="checkout-name"
                    className="mt-1 h-11"
                    autoComplete="name"
                    name="name"
                    placeholder={t.fullNameHint}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t.phoneNumber} <span className="text-primary">*</span></Label>
                    <Link href="/account/phone?next=/checkout" className="text-xs font-medium text-primary">
                      {t.changePhone}
                    </Link>
                  </div>
                  <Input className="mt-1 h-11" type="tel" value={phone} readOnly />
                  <p className="mt-1 text-xs text-muted-foreground">{t.phoneOnTicket}</p>
                </div>
                {pickup ? (
                  <div className="rounded-xl bg-[#F9FAFB] px-3 py-3 text-sm">
                    <p className="font-semibold text-[#111827]">{t.pickupAtCounter}</p>
                    <p className="mt-1 text-[#6B7280]">
                      {cart.restaurantAddress}, {cart.restaurantPostalCode} {cart.restaurantCity}
                    </p>
                    <p className="mt-1 text-[#6B7280]">
                      {interpolate(t.pickupEtaLabel, { min: String(cart.etaMin) })}
                    </p>
                  </div>
                ) : (
                  <>
                <div>
                  <Label>{t.street}</Label>
                  <Input className="mt-1 h-11" value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.postal}</Label>
                    <Input className="mt-1 h-11" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t.cityField}</Label>
                    <Input className="mt-1 h-11" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                </div>
                  </>
                )}
                <div>
                  <Label>{t.notes}</Label>
                  <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
            </section>
            <section className="rounded-[20px] border border-[#E8E8EC] bg-white px-5 py-4 sm:px-6">
              <h2 className="font-display text-base font-semibold tracking-tight text-[#111827]">
                {pickup ? t.pickupAtCounter : t.restaurantDelivers}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">
                {pickup ? t.pickupHint : t.restaurantDeliversHint}
              </p>
            </section>
            <PaymentPicker
              method={method}
              onMethod={setMethod}
              totalCents={totals.totalCents}
              card={card}
              expiry={expiry}
              cvc={cvc}
              onCard={setCard}
              onExpiry={setExpiry}
              onCvc={setCvc}
            />
          </div>
          <aside className="h-fit rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">{t.summary}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {cart.items.map((i) => (
                <li key={i.menuItemId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#111827]">{i.name}</p>
                    <p className="tabular-nums text-[#6B7280]">{formatEUR(i.priceCents * i.quantity, locale)}</p>
                  </div>
                  <QtyStepper
                    value={i.quantity}
                    onChange={(n) => setQty(i.menuItemId, n)}
                    label={t.qty}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="START5 · LOCAL5"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCode();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => void applyCode()}>
                {t.apply}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["START5", "LOCAL5"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => void applyCode(code)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    coupon?.code === code
                      ? "bg-[#922A49] text-white"
                      : "bg-[#FAF3EA] text-[#7A2340]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#6B7280]">
              {t.couponHintStart5} · {t.couponHintLocal5}
            </p>
            {couponBlocked && coupon ? (
              <p className="mt-2 text-[12px] font-medium text-destructive">
                {interpolate(t.couponMinNotMet, {
                  code: coupon.code,
                  min: formatEUR(coupon.minSubtotalCents ?? 0, locale),
                })}
              </p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm">
              <p className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="tabular-nums">{formatEUR(foodSubtotal, locale)}</span>
              </p>
              {discountCents > 0 && (
                <p className="flex justify-between text-emerald-700">
                  <span>{t.discount}</span>
                  <span>−{formatEUR(discountCents, locale)}</span>
                </p>
              )}
              <p className="flex justify-between text-muted-foreground">
                <span>{pickup ? t.fulfillmentPickup : t.fee}</span>
                <span className="tabular-nums">{formatEUR(pickup ? 0 : cart.deliveryFeeCents, locale)}</span>
              </p>
              <p className="flex justify-between text-base font-semibold">
                <span>{t.total}</span>
                <span className="tabular-nums">{formatEUR(totals.totalCents, locale)}</span>
              </p>
            </div>
            <Button
              className="mt-4 hidden h-12 w-full text-base lg:inline-flex"
              size="lg"
              disabled={busy || customerNeedsPhone(phone, "CUSTOMER") || fullName.trim().length < 2}
              onClick={pay}
            >
              {busy ? t.processing : t.placeOrder}
            </Button>
            <p className="mt-2 hidden text-center text-[11px] text-[#9CA3AF] lg:block">{t.demoPaymentNote}</p>
          </aside>
        </div>
        <div className="h-24 lg:hidden" aria-hidden />
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button
            className="h-12 w-full text-base font-semibold"
            size="lg"
            disabled={busy || customerNeedsPhone(phone, "CUSTOMER") || fullName.trim().length < 2}
            onClick={pay}
          >
            {busy ? t.processing : t.placeOrder}
          </Button>
        </div>
      </main>
  );
}
