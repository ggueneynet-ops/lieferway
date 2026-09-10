"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { LogoutButton } from "@/components/logout-button";
import { LocaleToggle } from "@/components/locale-toggle";

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

export function AccountMenu({
  user,
  locale,
  className = "",
  iconOnly = false,
  localeInMenu = "mobile",
}: {
  user: SessionUser | null;
  locale: Locale;
  className?: string;
  iconOnly?: boolean;
  localeInMenu?: "mobile" | "always";
}) {
  const copy = t(locale);
  const localeClass = localeInMenu === "always" ? "" : "sm:hidden";

  if (!user) {
    return (
      <details className={`relative ${className}`}>
        <summary
          className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-ink hover:bg-muted [&::-webkit-details-marker]:hidden sm:h-11 sm:w-auto sm:rounded-xl sm:px-3 sm:text-sm sm:font-medium"
          aria-label={copy.login}
        >
          <UserRound className="size-5 sm:hidden" strokeWidth={1.75} />
          <span className="hidden sm:inline">{copy.login}</span>
        </summary>
        <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface py-2 shadow-lg">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">{copy.language}</p>
          <div className="px-3 pb-2">
            <LocaleToggle />
          </div>
          <Link href="/login" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted">
            {copy.login}
          </Link>
        </div>
      </details>
    );
  }

  const mark = initials(user.name, user.email);

  return (
    <details className={`relative ${className}`}>
      <summary
        className={`flex cursor-pointer list-none items-center justify-center hover:bg-muted [&::-webkit-details-marker]:hidden ${
          iconOnly
            ? "size-10 rounded-full bg-[#FAF3EA] text-[12px] font-semibold text-[#7A2340]"
            : "size-10 rounded-full bg-[#FAF3EA] text-[12px] font-semibold text-[#7A2340] sm:h-11 sm:w-auto sm:gap-2 sm:rounded-xl sm:bg-transparent sm:px-3 sm:text-sm sm:font-medium sm:text-ink"
        }`}
        aria-label={copy.account}
      >
        <span className={iconOnly ? "" : "sm:hidden"}>{mark}</span>
        {iconOnly ? null : <span className="hidden sm:inline">{copy.account}</span>}
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
        <p className="truncate px-3 py-2 text-xs text-text-secondary">{user.email}</p>
        <div className={`px-3 pb-2 pt-1 ${localeClass}`}>
          <p className="pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">{copy.language}</p>
          <LocaleToggle />
        </div>
        {user.role === "CUSTOMER" ? (
          <>
            <Link href="/account" className="block px-3 py-2.5 text-sm hover:bg-muted">
              {copy.profile}
            </Link>
            <Link href="/orders" className="block px-3 py-2.5 text-sm hover:bg-muted">
              {copy.myOrders}
            </Link>
          </>
        ) : null}
        {user.role === "RESTAURANT" ? (
          <Link href="/restaurant" className="block px-3 py-2.5 text-sm hover:bg-muted">
            {copy.restaurantPanel}
          </Link>
        ) : null}
        {user.role === "ADMIN" ? (
          <Link href="/admin" className="block px-3 py-2.5 text-sm hover:bg-muted">
            {copy.navStart}
          </Link>
        ) : null}
        <div className="mt-1 border-t border-border pt-1">
          <LogoutButton label={copy.logout} variant="menu" />
        </div>
      </div>
    </details>
  );
}
