"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth";

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const panel =
    user?.role === "ADMIN"
      ? { href: "/admin", label: t.adminPanel }
      : user?.role === "RESTAURANT"
        ? { href: "/restaurant", label: t.restaurantPanel }
        : user?.role === "COURIER"
          ? { href: "/courier", label: t.courierPanel }
          : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-primary" />
          {t.city}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex overflow-hidden rounded-full border text-xs font-medium">
            <button
              type="button"
              onClick={() => setLocale("de")}
              className={`px-2.5 py-1 ${locale === "de" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              DE
            </button>
            <button
              type="button"
              onClick={() => setLocale("tr")}
              className={`px-2.5 py-1 ${locale === "tr" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              TR
            </button>
          </div>
          {panel && (
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href={panel.href}>{panel.label}</Link>
            </Button>
          )}
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/orders">{t.myOrders}</Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={logout} title={t.logout}>
                <UserRound className="size-4" />
              </Button>
            </>
          ) : user === null ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t.login}</Link>
            </Button>
          ) : null}
          <Button asChild className="relative">
            <Link href="/cart">
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">{t.cart}</span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
