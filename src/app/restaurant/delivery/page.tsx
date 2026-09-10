import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";
import { DeliveryEtaForm } from "./eta-form";

export const dynamic = "force-dynamic";

function euroDefault(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function RestaurantDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  const q = await searchParams;
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpDelivery}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  return (
    <RestaurantAppShell title={t.rpDelivery} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpDelivery}</h1>
      {q.ok === "delivery" ? (
        <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm">{t.deliveryTimesSaved}</p>
      ) : null}
      {q.ok === "radius" ? (
        <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm">{t.radiusSaved}</p>
      ) : null}
      {q.error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p> : null}

      <DeliveryEtaForm
        restaurantId={restaurant.id}
        etaMin={restaurant.etaMin}
        etaMax={restaurant.etaMax}
        minOrderEuro={euroDefault(restaurant.minOrderCents)}
        deliveryFeeEuro={euroDefault(restaurant.deliveryFeeCents)}
      />

      <p className="mb-3 text-sm text-[#6B7280]">{t.maxDeliveryRadiusHint}</p>
      <form action="/restaurant/radius" method="post" className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <input type="hidden" name="id" value={restaurant.id} />
        <label htmlFor="maxDeliveryKm" className="text-sm font-medium">
          {t.maxDeliveryRadius}
        </label>
        <input
          id="maxDeliveryKm"
          name="maxDeliveryKm"
          inputMode="decimal"
          placeholder={t.unlimitedRadius}
          defaultValue={restaurant.maxDeliveryKm != null ? String(restaurant.maxDeliveryKm) : ""}
          className="mt-1 h-12 w-full rounded-lg border border-[#E5E7EB] px-3 text-base"
        />
        <button type="submit" className="mt-3 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white">
          {t.save}
        </button>
        <p className="mt-2 text-xs text-[#6B7280]">
          {restaurant.maxDeliveryKm != null
            ? interpolate(t.withinRadius, { km: String(restaurant.maxDeliveryKm) })
            : t.unlimitedRadius}
        </p>
      </form>
    </RestaurantAppShell>
  );
}
