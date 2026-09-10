"use client";

import { Bike, ShoppingBag } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import type { FulfillmentType } from "@/lib/constants";

export function FulfillmentToggle({
  value,
  onChange,
  pickupAllowed,
  compact = false,
}: {
  value: FulfillmentType;
  onChange: (next: FulfillmentType) => void;
  pickupAllowed: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (!pickupAllowed) return null;
  const options: { id: FulfillmentType; label: string; Icon: typeof Bike }[] = [
    { id: "DELIVERY", label: t.fulfillmentDelivery, Icon: Bike },
    { id: "PICKUP", label: t.fulfillmentPickup, Icon: ShoppingBag },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t.fulfillmentPickup}
      className={
        compact
          ? "inline-flex h-9 shrink-0 items-center rounded-full bg-[#F3F4F6] p-0.5"
          : "inline-flex h-10 w-full max-w-md items-center rounded-full bg-[#F3F4F6] p-0.5"
      }
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={
            compact
              ? `inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold whitespace-nowrap ${
                  value === opt.id ? "bg-[#E91E63] text-white" : "text-[#6B7280] hover:text-[#111827]"
                }`
              : `inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
                  value === opt.id ? "bg-[#E91E63] text-white" : "text-[#6B7280] hover:text-[#111827]"
                }`
          }
        >
          {compact ? null : <opt.Icon className="size-3.5 shrink-0" strokeWidth={2} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
