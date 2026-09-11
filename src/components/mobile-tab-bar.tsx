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
        className="fixed inset-x-3 bottom-[max(0.55rem,env(safe-area-inset-bottom,0px))] z-40 overflow-hidden rounded-[22px] border border-white/70 bg-white/78 shadow-[0_12px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl md:hidden"
        aria-label="Hauptnavigation"
      >
        <ul className="grid h-[4.2rem] grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`relative flex h-full min-h-11 flex-col items-center justify-center gap-1 ${
                  tab.active ? "text-[#E91E63]" : "text-[#94A3B8]"
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    tab.active ? "bg-[#FCE4EC]" : ""
                  }`}
                >
                  <tab.icon
                    className={tab.active ? "size-[22px] fill-[#E91E63]" : "size-[21px]"}
                    strokeWidth={tab.active ? 2.4 : 1.75}
                  />
                </span>
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
