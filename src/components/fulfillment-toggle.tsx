"use client";

import { useI18n } from "@/components/locale-provider";
import type { FulfillmentType } from "@/lib/constants";

export function FulfillmentToggle({
  value,
  onChange,
  pickupAllowed,
}: {
  value: FulfillmentType;
  onChange: (next: FulfillmentType) => void;
  pickupAllowed: boolean;
}) {
  const { t } = useI18n();
  if (!pickupAllowed) return null;
  const options: { id: FulfillmentType; label: string }[] = [
    { id: "DELIVERY", label: t.fulfillmentDelivery },
    { id: "PICKUP", label: t.fulfillmentPickup },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t.fulfillmentPickup}
      className="inline-flex h-10 w-full max-w-md items-center rounded-full bg-[#F3F4F6] p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`h-9 flex-1 rounded-full px-3 text-[13px] font-semibold ${
            value === opt.id ? "bg-[#E91E63] text-white" : "text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
