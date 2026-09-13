import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCopy } from "@/lib/get-locale";
import { LogoutButton } from "@/components/logout-button";
import { LocaleToggle } from "@/components/locale-toggle";
import { RestaurantTabBar } from "@/components/restaurant-tab-bar";
import { SiteFooter } from "@/components/site-footer";

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

  return (
    <div className="rp-app flex min-h-full flex-col bg-[#F7F2F4] text-[#111827]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#F8BBD0]/50 bg-white px-4 py-3">
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
      <div className="hidden border-b border-[#F8BBD0]/40 bg-white px-4 py-2.5 md:block">
        <p className="text-[15px] font-semibold text-[#111827]">{title}</p>
      </div>
      <main className="mx-auto w-full max-w-lg flex-1 px-3 pb-4 pt-3 md:max-w-2xl md:px-4">{children}</main>
      <div className="pb-24">
        <SiteFooter compact partner />
      </div>
      <RestaurantTabBar home={t.rpHome} orders={t.ordersCount} menu={t.navMenu} more={t.rpMore} />
    </div>
  );
}
