import Link from "next/link";
import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { PersonalOrderLink } from "@/components/personal-order-link";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { publicOrigin } from "@/lib/public-origin";
import { Bike, Clock, Settings, Star, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RestaurantMorePage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  const origin = await publicOrigin();
  const links = [
    { href: "/restaurant/hours", label: t.rpHours, icon: Clock },
    { href: "/restaurant/delivery", label: t.rpDelivery, icon: Bike },
    { href: "/restaurant/reviews", label: t.rpReviews, icon: Star },
    { href: "/restaurant/settings", label: t.rpSettings, icon: Settings },
  ];

  return (
    <RestaurantAppShell title={t.rpMore} restaurantName={restaurant?.name} isOpen={restaurant?.isOpen}>
      <h1 className="mb-3 font-display text-xl font-semibold tracking-tight">{t.rpMore}</h1>
      {restaurant ? (
        <div className="mb-4">
          <PersonalOrderLink slug={restaurant.slug} origin={origin} />
        </div>
      ) : null}
      <Link
        href="/restaurant/finance"
        className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[#B72E57] px-4 py-4 text-white shadow-[0_10px_24px_rgba(183,46,87,0.22)]"
      >
        <span className="flex items-center gap-3">
          <Wallet className="size-6" strokeWidth={1.75} />
          <span>
            <span className="block text-[15px] font-semibold">{t.rpFinance}</span>
            <span className="block text-[12px] text-white/85">{t.rpFinanceHint}</span>
          </span>
        </span>
        <span className="text-lg font-semibold">→</span>
      </Link>
      <ul className="overflow-hidden rounded-2xl border border-[#E8C5D0]/60 bg-white shadow-[0_6px_18px_rgba(17,24,39,0.04)]">
        {links.map((l) => (
          <li key={l.href} className="border-b border-[#F3F4F6] last:border-0">
            <Link href={l.href} className="flex items-center gap-3 px-4 py-4 text-[15px] font-medium text-[#111827]">
              <l.icon className="size-5 text-[#B72E57]" strokeWidth={1.75} />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </RestaurantAppShell>
  );
}
