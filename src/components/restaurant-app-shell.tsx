import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCopy } from "@/lib/get-locale";
import { LogoutButton } from "@/components/logout-button";
import { LocaleToggle } from "@/components/locale-toggle";
import { ClipboardList, House, LayoutGrid, UtensilsCrossed } from "lucide-react";

export async function RestaurantAppShell({
  children,
  title,
  restaurantName,
  isOpen,
}: {
  children: React.ReactNode;
  title: string;
  restaurantName?: string;
  isOpen?: boolean;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/restaurant");
  if (session.role !== "RESTAURANT" && session.role !== "ADMIN") redirect("/");
  const { t } = await getCopy();
  const tabs = [
    { href: "/restaurant", label: t.rpHome, icon: House },
    { href: "/restaurant/orders", label: t.ordersCount, icon: ClipboardList },
    { href: "/restaurant/menu", label: t.navMenu, icon: UtensilsCrossed },
    { href: "/restaurant/more", label: t.rpMore, icon: LayoutGrid },
  ];

  return (
    <div className="rp-app flex min-h-full flex-col bg-[#F4F4F5] text-[#111827]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3">
        <div className="min-w-0">
          <Logo size="sm" />
          <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">
            {restaurantName ?? session.name}
            {isOpen != null ? ` · ${isOpen ? t.open : t.closed}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LogoutButton label={t.logout} variant="header" />
          <LocaleToggle />
        </div>
      </header>
      <div className="hidden border-b border-[#E5E7EB] bg-white px-4 py-2 md:block">
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
      </div>
      <main className="mx-auto w-full max-w-lg flex-1 px-3 pb-24 pt-3 md:max-w-2xl md:px-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <ul className="mx-auto grid max-w-lg grid-cols-4 md:max-w-2xl">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-[#6B7280] hover:text-[#111827]"
              >
                <tab.icon className="size-5" strokeWidth={1.75} />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
