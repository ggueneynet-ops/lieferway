import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/constants";
import { getCopy } from "@/lib/get-locale";
import { LocaleToggle } from "@/components/locale-toggle";
import { LogoutButton } from "@/components/logout-button";

export async function PanelShell({
  children,
  roles,
  title,
}: {
  children: React.ReactNode;
  roles: Role[];
  title: string;
}) {
  const session = await getSession();
  if (!session) {
    const next = roles.includes("ADMIN")
      ? "/admin"
      : roles.includes("RESTAURANT")
        ? "/restaurant"
        : roles.includes("COURIER")
          ? "/courier"
          : "/";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!roles.includes(session.role) && session.role !== "ADMIN") redirect("/");
  const { t } = await getCopy();
  const NAV: Record<string, { href: string; label: string }[]> = {
    RESTAURANT: [
      { href: "/restaurant", label: t.navOrders },
      { href: "/restaurant/menu", label: t.navMenu },
    ],
    COURIER: [{ href: "/courier", label: t.navTours }],
    ADMIN: [
      { href: "/admin", label: t.adminDashboard },
      { href: "/admin/live", label: t.adminLive },
      { href: "/admin/applications", label: t.partnerApplications },
      { href: "/admin/restaurants", label: t.restaurants },
      { href: "/admin/orders", label: t.navOrders },
      { href: "/admin/payouts", label: t.navPayouts },
      { href: "/admin/coupons", label: t.adminCoupons },
      { href: "/admin/users", label: t.adminUsers },
      { href: "/admin/security", label: t.adminSecurity },
    ],
  };
  const links = NAV[session.role === "ADMIN" && roles.includes("ADMIN") ? "ADMIN" : session.role] ?? NAV.ADMIN;

  return (
    <div className="dashboard-shell flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-3 py-3 md:block">
          <Logo size="sm" />
          <p className="mt-2 hidden text-[11px] leading-snug text-text-secondary md:block">
            {session.name}
            <br />
            {session.email}
          </p>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-2.5 text-[15px] text-ink hover:bg-bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] text-text-secondary hover:bg-bg-muted"
          >
            {t.toMarketplace}
          </Link>
          <div className="md:mt-2">
            <LogoutButton label={t.logout} variant="sidebar" />
          </div>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
          <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-ink">{title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <LogoutButton label={t.logout} variant="header" />
            <LocaleToggle />
          </div>
        </header>
        <div className="p-3 md:p-5">{children}</div>
      </div>
    </div>
  );
}
