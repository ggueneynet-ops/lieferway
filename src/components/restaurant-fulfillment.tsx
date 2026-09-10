"use client";

import { useEffect, useState } from "react";
import { Bike, ShoppingBag } from "lucide-react";
import { FulfillmentToggle } from "@/components/fulfillment-toggle";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { interpolate } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import type { FulfillmentType } from "@/lib/constants";
import { parseFulfillment, readClientFulfillment } from "@/lib/fulfillment";

function storageKey(restaurantId: string) {
  return `lw_fulfill_${restaurantId}`;
}

export function RestaurantFulfillment({
  restaurantId,
  pickupAllowed,
  address,
  city,
  postalCode,
  etaMin,
  deliveryFeeCents,
  launchWeekFreeDelivery,
}: {
  restaurantId: string;
  pickupAllowed: boolean;
  address: string;
  city: string;
  postalCode: string;
  etaMin: number;
  deliveryFeeCents: number;
  launchWeekFreeDelivery?: boolean;
}) {
  const { t, locale } = useI18n();
  const { cart, setFulfillment } = useCart();
  const [mode, setMode] = useState<FulfillmentType>("DELIVERY");

  useEffect(() => {
    setMode(readClientFulfillment(restaurantId));
  }, [restaurantId]);

  useEffect(() => {
    if (cart?.restaurantId === restaurantId) {
      setMode(parseFulfillment(cart.fulfillmentType));
    }
  }, [cart?.restaurantId, cart?.fulfillmentType, restaurantId]);

  function choose(next: FulfillmentType) {
    setMode(next);
    try {
      window.sessionStorage.setItem(storageKey(restaurantId), next);
    } catch {
      /* ignore */
    }
    setFulfillment(next, {
      restaurantId,
      pickupAllowed,
      listedDeliveryFeeCents: deliveryFeeCents,
      restaurantAddress: address,
      restaurantCity: city,
      restaurantPostalCode: postalCode,
      etaMin,
    });
  }

  if (!pickupAllowed) {
    return (
      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#F7EBEF] px-2.5 py-1 text-[11px] font-semibold text-[#922546]">
        <Bike className="size-3 shrink-0" strokeWidth={2} />
        {t.restaurantDelivers}
      </p>
    );
  }

  const pickup = mode === "PICKUP";
  return (
    <div className="mt-3 space-y-2">
      <FulfillmentToggle pickupAllowed value={mode} onChange={choose} />
      {pickup ? (
        <div className="rounded-2xl border border-[#B72E57]/20 bg-[#F7EBEF] px-3.5 py-3">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#922546]">
            <ShoppingBag className="size-3.5" strokeWidth={2} />
            {t.pickupAtCounter}
          </p>
          <p className="mt-1 text-sm text-[#111827]">
            {address}, {postalCode} {city}
          </p>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            {t.pickupFeeNone} · {interpolate(t.pickupEtaLabel, { min: String(etaMin) })}
          </p>
          <p className="mt-1 text-[13px] text-[#6B7280]">{t.pickupHint}</p>
        </div>
      ) : (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#F7EBEF] px-2.5 py-1 text-[11px] font-semibold text-[#922546]">
          <Bike className="size-3 shrink-0" strokeWidth={2} />
          {launchWeekFreeDelivery ? `${t.launchWeekBadge} · ${t.badgeFreeDelivery}` : t.restaurantDelivers}
        </p>
      )}
      {pickup ? (
        <p className="text-[12px] text-[#6B7280]">
          {t.fee}: {formatEUR(0, locale)} · {t.infoEta}: {interpolate(t.pickupEtaLabel, { min: String(etaMin) })}
        </p>
      ) : null}
    </div>
  );
}
