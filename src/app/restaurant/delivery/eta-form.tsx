"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { interpolate } from "@/lib/i18n";

type Props = {
  restaurantId: string;
  etaMin: number;
  etaMax: number;
  minOrderEuro: string;
  deliveryFeeEuro: string;
  pickupAllowed: boolean;
  launchWeekFreeDelivery: boolean;
};

function digits(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function DeliveryEtaForm({
  restaurantId,
  etaMin,
  etaMax,
  minOrderEuro,
  deliveryFeeEuro,
  pickupAllowed,
  launchWeekFreeDelivery,
}: Props) {
  const { t } = useI18n();
  const [min, setMin] = useState(String(etaMin));
  const [max, setMax] = useState(String(etaMax));
  const [order, setOrder] = useState(minOrderEuro);
  const [fee, setFee] = useState(deliveryFeeEuro);

  const preview = useMemo(() => {
    const a = Number.parseInt(digits(min), 10);
    const b = Number.parseInt(digits(max), 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) {
      return interpolate(t.etaPreview, { min: "—", max: "—" });
    }
    return interpolate(t.etaPreview, { min: String(a), max: String(b) });
  }, [min, max, t.etaPreview]);

  return (
    <form action="/restaurant/delivery/save" method="post" className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <input type="hidden" name="id" value={restaurantId} />
      <p className="text-sm font-semibold text-[#111827]">{t.infoEta}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{t.etaHint}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="etaMin" className="text-sm font-medium">
            {t.etaMinLabel}
          </label>
          <input
            id="etaMin"
            name="etaMin"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={min}
            onChange={(e) => setMin(digits(e.target.value))}
            className="mt-1 h-12 w-full rounded-lg border border-[#E5E7EB] px-3 text-base tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="etaMax" className="text-sm font-medium">
            {t.etaMaxLabel}
          </label>
          <input
            id="etaMax"
            name="etaMax"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={max}
            onChange={(e) => setMax(digits(e.target.value))}
            className="mt-1 h-12 w-full rounded-lg border border-[#E5E7EB] px-3 text-base tabular-nums"
          />
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-[#111827]">{preview}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="minOrderEuro" className="text-sm font-medium">
            {t.minOrderEuro}
          </label>
          <input
            id="minOrderEuro"
            name="minOrderEuro"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg border border-[#E5E7EB] px-3 text-base tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="deliveryFeeEuro" className="text-sm font-medium">
            {t.deliveryFeeEuro}
          </label>
          <input
            id="deliveryFeeEuro"
            name="deliveryFeeEuro"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg border border-[#E5E7EB] px-3 text-base tabular-nums"
          />
        </div>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-[#F9FAFB] px-3 py-3">
        <input
          type="checkbox"
          name="pickupAllowed"
          value="1"
          defaultChecked={pickupAllowed}
          className="mt-1 size-4 accent-[#E91E63]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#111827]">{t.pickupAllowed}</span>
          <span className="mt-0.5 block text-sm text-[#6B7280]">{t.pickupAllowedHint}</span>
        </span>
      </label>
      <label className="mt-3 flex items-start gap-3 rounded-xl bg-[#FFF5F8]/70 px-3 py-3">
        <input
          type="checkbox"
          name="launchWeekFreeDelivery"
          value="1"
          defaultChecked={launchWeekFreeDelivery}
          className="mt-1 size-4 accent-[#E91E63]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#111827]">{t.launchWeekToggle}</span>
          <span className="mt-0.5 block text-sm text-[#6B7280]">{t.launchWeekToggleHint}</span>
        </span>
      </label>
      <button type="submit" className="mt-4 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white">
        {t.save}
      </button>
    </form>
  );
}
