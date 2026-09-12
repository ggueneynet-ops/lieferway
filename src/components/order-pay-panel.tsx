"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { useI18n } from "@/components/locale-provider";

export function OrderPayPanel({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [client, setClient] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${orderId}/pay`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t.payFailed);
        if (data.paid) {
          router.refresh();
          return;
        }
        if (data.clientSecret && data.publishableKey && !cancelled) {
          setClient({ clientSecret: data.clientSecret, publishableKey: data.publishableKey });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t.payFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, router, t.payFailed]);

  if (error) return <p className="mt-4 text-sm text-destructive">{error}</p>;
  if (!client) return <p className="mt-4 text-sm text-[#64748B]">{t.processing}</p>;

  return (
    <StripePaymentForm
      clientSecret={client.clientSecret}
      publishableKey={client.publishableKey}
      returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/orders/${orderId}`}
      onPaid={() => router.refresh()}
    />
  );
}
