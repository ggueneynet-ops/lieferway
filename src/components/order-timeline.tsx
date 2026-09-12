"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { type OrderStatus } from "@/lib/constants";
import { orderStatusLabel, STATUS_LABEL, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import { customerStatusFlow, customerStep, isPickup } from "@/lib/fulfillment";

function hintFor(step: OrderStatus, pickup: boolean, t: ReturnType<typeof useI18n>["t"]) {
  if (step === "PLACED") return t.stepPlacedHint;
  if (step === "ACCEPTED") return t.stepAcceptedHint;
  if (step === "PREPARING") return t.stepPreparingHint;
  if (step === "READY") return pickup ? t.stepPickupReadyHint : t.stepPreparingHint;
  if (step === "OUT_FOR_DELIVERY") return t.stepOutHint;
  return pickup ? t.stepPickedUpHint : t.stepDeliveredHint;
}

export function OrderTimeline({
  status,
  locale = "de",
  fulfillmentType,
}: {
  status: string;
  locale?: Locale;
  fulfillmentType?: string | null;
}) {
  const { t } = useI18n();
  if (status === "PENDING_PAYMENT") {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {STATUS_LABEL[locale].PENDING_PAYMENT ?? t.waitingForPayment}
      </p>
    );
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {STATUS_LABEL[locale][status]}
      </p>
    );
  }
  const pickup = isPickup(fulfillmentType);
  const flow = customerStatusFlow(fulfillmentType);
  const current = customerStep(status, fulfillmentType);
  const idx = flow.indexOf(current);
  const delivered = status === "DELIVERED";

  return (
    <ol className="relative">
      {flow.map((step, i) => {
        const complete = delivered || idx > i;
        const isCurrent = !delivered && idx === i;
        return (
          <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
            {i < flow.length - 1 ? (
              <span
                className={`absolute start-[11px] top-7 h-[calc(100%-8px)] w-0.5 ${
                  complete ? "bg-[#E91E63]" : "bg-[#E5E7EB]"
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                complete
                  ? "bg-[#E91E63] text-white"
                  : isCurrent
                    ? "lw-step-current bg-[#E91E63] text-white"
                    : "bg-[#F3F4F6] text-[#9CA3AF]"
              }`}
            >
              {complete ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-[15px] leading-tight ${complete || isCurrent ? "font-semibold text-[#111827]" : "text-[#9CA3AF]"}`}>
                {orderStatusLabel(locale, step, fulfillmentType)}
              </p>
              {isCurrent || (delivered && i === flow.length - 1) ? (
                <p className="mt-0.5 text-[13px] text-[#6B7280]">{hintFor(step, pickup, t)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTracker({
  orderId,
  initialStatus,
  locale = "de",
  shortCode,
  restaurantName,
  fulfillmentType,
}: {
  orderId: string;
  initialStatus: string;
  locale?: Locale;
  shortCode?: string;
  restaurantName?: string;
  fulfillmentType?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [fulfillment, setFulfillment] = useState(fulfillmentType ?? "DELIVERY");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setFulfillment(fulfillmentType ?? "DELIVERY");
  }, [fulfillmentType]);

  useEffect(() => {
    let stopped = false;
    let last = initialStatus;
    const tick = async () => {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok || stopped) return;
      const data = (await res.json()) as { order?: { status?: string; fulfillmentType?: string } };
      const next = data.order?.status;
      if (data.order?.fulfillmentType) setFulfillment(data.order.fulfillmentType);
      if (next && next !== last) {
        last = next;
        setStatus(next);
        const label = orderStatusLabel(locale, next, data.order?.fulfillmentType ?? fulfillment);
        const msg = restaurantName ? `${restaurantName} · ${label}` : label;
        setFlash(msg);
        const line = shortCode ? `${shortCode} · ${label}` : msg;
        if (next === "REJECTED" || next === "CANCELLED") toast.error(line);
        else toast.success(line);
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 1200);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [orderId, initialStatus, locale, shortCode, restaurantName, fulfillment]);

  return (
    <div>
      {flash ? (
        <p className="mb-4 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-ink">{flash}</p>
      ) : null}
      <OrderTimeline status={status} locale={locale} fulfillmentType={fulfillment} />
    </div>
  );
}
