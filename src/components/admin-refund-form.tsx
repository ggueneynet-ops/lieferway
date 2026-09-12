"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

export function AdminRefundForm({
  orderId,
  remainingCents,
  paymentMethod,
}: {
  orderId: string;
  remainingCents: number;
  paymentMethod: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);

  if (paymentMethod === "CASH" || remainingCents <= 0) {
    return <p className="mt-1 text-sm text-text-secondary">{t.adminRefundsStub}</p>;
  }

  async function refund(full: boolean) {
    setBusy(true);
    try {
      const euros = Number(amount.replace(",", "."));
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full,
          amountCents: full ? undefined : Math.round(euros * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.refundFailed);
      toast.success(t.refundSuccess);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.refundFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-text-secondary">
        {t.refundAmount}: {formatEUR(remainingCents, locale)}
      </p>
      <div>
        <Label htmlFor="refund-amount">{t.refundPartial}</Label>
        <Input
          id="refund-amount"
          className="mt-1"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} variant="outline" onClick={() => void refund(false)}>
          {t.refundPartial}
        </Button>
        <Button type="button" disabled={busy} onClick={() => void refund(true)}>
          {t.refundFull}
        </Button>
      </div>
    </div>
  );
}
