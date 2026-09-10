"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, House, LayoutGrid, UtensilsCrossed } from "lucide-react";

const MORE_PREFIXES = [
  "/restaurant/more",
  "/restaurant/hours",
  "/restaurant/delivery",
  "/restaurant/finance",
  "/restaurant/reviews",
  "/restaurant/settings",
];

export function RestaurantTabBar({
  home,
  orders,
  menu,
  more,
}: {
  home: string;
  orders: string;
  menu: string;
  more: string;
}) {
  const path = usePathname();
  const tabs = [
    { href: "/restaurant", label: home, icon: House, active: path === "/restaurant" },
    {
      href: "/restaurant/orders",
      label: orders,
      icon: ClipboardList,
      active: path.startsWith("/restaurant/orders") || path.startsWith("/restaurant/bon"),
    },
    {
      href: "/restaurant/menu",
      label: menu,
      icon: UtensilsCrossed,
      active: path.startsWith("/restaurant/menu"),
    },
    {
      href: "/restaurant/more",
      label: more,
      icon: LayoutGrid,
      active: MORE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#F8BBD0]/60 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <ul className="mx-auto grid max-w-lg grid-cols-4 md:max-w-2xl">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                tab.active ? "text-[#922A49]" : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              <tab.icon className="size-5" strokeWidth={tab.active ? 2.2 : 1.75} />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
