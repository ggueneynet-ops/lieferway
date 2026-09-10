import Link from "next/link";
import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantLogoForm } from "@/components/restaurant-logo-form";
import { PersonalOrderLink } from "@/components/personal-order-link";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { publicOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export default async function RestaurantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  const origin = await publicOrigin();
  const q = await searchParams;
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpSettings}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  return (
    <RestaurantAppShell title={t.rpSettings} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpSettings}</h1>
      {q.ok === "logo" ? <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm">{t.logoSaved}</p> : null}
      {q.error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p> : null}
      <div className="mb-4">
        <PersonalOrderLink slug={restaurant.slug} origin={origin} />
      </div>
      <Link
        href="/restaurant/delivery"
        className="mb-4 block rounded-2xl border border-[#E5E7EB] bg-white p-4"
      >
        <p className="text-sm font-semibold text-[#111827]">{t.rpDelivery}</p>
        <p className="mt-1 text-sm text-[#6B7280]">{t.deliveryFromSettings}</p>
        <p className="mt-2 text-sm font-medium text-primary">
          {restaurant.etaMin}–{restaurant.etaMax} Min. · {t.minOrderEuro} {(restaurant.minOrderCents / 100).toFixed(2)} €
          {restaurant.pickupAllowed !== false ? ` · ${t.pickupAllowed}` : ""}
        </p>
      </Link>
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <RestaurantLogoForm
          restaurantId={restaurant.id}
          name={restaurant.name}
          slug={restaurant.slug}
          logoUrl={restaurant.logoUrl}
          action="/restaurant/logo"
          labels={{
            shopLogo: t.shopLogo,
            shopLogoHint: t.shopLogoHint,
            save: t.save,
            photoOptional: t.logoUrlPlaceholder,
          }}
        />
      </div>
      <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#111827]">
        {t.eInvoiceComing}
        <span className="mt-1 block text-[#6B7280]">{t.eInvoiceComingHint}</span>
      </p>
    </RestaurantAppShell>
  );
}
