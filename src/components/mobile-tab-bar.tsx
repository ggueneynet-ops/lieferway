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
      <div className="h-16 md:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <ul className="grid h-16 grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] ${
                  tab.active ? "font-semibold text-primary" : "text-text-secondary"
                }`}
              >
                <tab.icon className="size-[18px]" strokeWidth={1.75} />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
