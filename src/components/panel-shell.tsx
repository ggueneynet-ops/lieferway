import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/constants";

const NAV: Record<string, { href: string; label: string }[]> = {
  RESTAURANT: [
    { href: "/restaurant", label: "Bestellungen" },
    { href: "/restaurant/menu", label: "Speisekarte" },
  ],
  COURIER: [{ href: "/courier", label: "Touren" }],
  ADMIN: [
    { href: "/admin", label: "Übersicht" },
    { href: "/admin/restaurants", label: "Restaurants" },
    { href: "/admin/users", label: "Nutzer" },
    { href: "/admin/orders", label: "Bestellungen" },
    { href: "/admin/payouts", label: "Auszahlungen" },
    { href: "/admin/coupons", label: "Gutscheine" },
  ],
};

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
  if (!session) redirect("/login");
  if (!roles.includes(session.role) && session.role !== "ADMIN") redirect("/");
  const links = NAV[session.role === "ADMIN" && roles.includes("ADMIN") ? "ADMIN" : session.role] ?? NAV.ADMIN;

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Logo size="sm" />
          <p className="mt-3 hidden text-xs text-muted-foreground md:block">
            {session.name}
            <br />
            {session.email}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            Zum Marktplatz
          </Link>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="border-b bg-white px-4 py-4 md:px-8">
          <h1 className="text-xl font-semibold">{title}</h1>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
