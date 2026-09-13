"use client";

import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function stripePromise(publishableKey: string) {
  let cached = stripePromiseCache.get(publishableKey);
  if (!cached) {
    cached = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, cached);
  }
  return cached;
}

function InnerForm({
  returnUrl,
  onPaid,
}: {
  returnUrl: string;
  onPaid?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    if (err) {
      setError(err.message || t.payFailed);
      setBusy(false);
      return;
    }
    onPaid?.();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="h-12 w-full text-base" size="lg" type="submit" disabled={busy || !stripe}>
        {busy ? t.processing : t.payNow}
      </Button>
      
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  publishableKey,
  returnUrl,
  onPaid,
}: {
  clientSecret: string;
  publishableKey: string;
  returnUrl: string;
  onPaid?: () => void;
}) {
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#E91E63",
          borderRadius: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      },
    }),
    [clientSecret],
  );

  if (!clientSecret || !publishableKey) return null;

  return (
    <Elements stripe={stripePromise(publishableKey)} options={options}>
      <InnerForm returnUrl={returnUrl} onPaid={onPaid} />
    </Elements>
  );
}
