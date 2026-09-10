"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FulfillmentToggle } from "@/components/fulfillment-toggle";
import { FULFILLMENT_COOKIE, type FulfillmentType } from "@/lib/constants";
import { parseFulfillment } from "@/lib/fulfillment";

export function persistMarketFulfillment(next: FulfillmentType) {
  document.cookie = `${FULFILLMENT_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
  try {
    window.sessionStorage.setItem("lw_fulfill", next);
  } catch {
    /* ignore */
  }
}

export function MarketFulfillmentSwitch({
  initial,
  compact = false,
}: {
  initial: FulfillmentType;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<FulfillmentType>(parseFulfillment(initial));

  function onChange(next: FulfillmentType) {
    setValue(next);
    persistMarketFulfillment(next);
    router.refresh();
  }

  return <FulfillmentToggle pickupAllowed value={value} onChange={onChange} compact={compact} />;
}
