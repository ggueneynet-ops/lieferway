"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Receipt, UserRound } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { useCart } from "@/components/cart-provider";
import { isStaffArea } from "@/lib/paths";

export function MobileTabBar() {
  const path = usePathname();
  const { t } = useI18n();
  const { sheetOpen } = useCart();

  if (
    sheetOpen ||
    isStaffArea(path) ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/checkout") ||
    path.startsWith("/partner")
  ) {
    return null;
  }

  const tabs = [
    { href: "/", label: t.navHome, icon: Home, active: path === "/" },
    { href: "/suchen", label: t.navSearch, icon: Search, active: path.startsWith("/suchen") },
    { href: "/orders", label: t.orders, icon: Receipt, active: path.startsWith("/orders") },
    { href: "/account", label: t.account, icon: UserRound, active: path.startsWith("/account") },
  ];

  return (
    <>
      <div className="h-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:hidden" aria-hidden />
      <nav
        className="fixed inset-x-3 bottom-[max(0.55rem,env(safe-area-inset-bottom,0px))] z-40 overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[0_14px_44px_rgba(15,23,42,0.18)] backdrop-blur-2xl md:hidden"
        aria-label="Hauptnavigation"
      >
        <ul className="grid h-[4.25rem] grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 ${
                  tab.active ? "text-[#E91E63]" : "text-[#94A3B8]"
                }`}
              >
                <tab.icon
                  className={tab.active ? "size-6 fill-[#E91E63] text-[#E91E63]" : "size-[22px]"}
                  strokeWidth={tab.active ? 2.6 : 1.7}
                />
                <span className={`text-[11px] leading-none ${tab.active ? "font-bold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
