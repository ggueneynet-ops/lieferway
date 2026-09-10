import Link from "next/link";
import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { Bike, Clock, Settings, Star, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RestaurantMorePage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  const links = [
    { href: "/restaurant/hours", label: t.rpHours, icon: Clock },
    { href: "/restaurant/delivery", label: t.rpDelivery, icon: Bike },
    { href: "/restaurant/finance", label: t.rpFinance, icon: Wallet },
    { href: "/restaurant/reviews", label: t.rpReviews, icon: Star },
    { href: "/restaurant/settings", label: t.rpSettings, icon: Settings },
  ];

  return (
    <RestaurantAppShell title={t.rpMore} restaurantName={restaurant?.name} isOpen={restaurant?.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpMore}</h1>
      <ul className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        {links.map((l) => (
          <li key={l.href} className="border-b border-[#E5E7EB] last:border-0">
            <Link href={l.href} className="flex items-center gap-3 px-4 py-4 text-[15px] font-medium text-[#111827]">
              <l.icon className="size-5 text-[#9CA3AF]" strokeWidth={1.75} />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </RestaurantAppShell>
  );
}
