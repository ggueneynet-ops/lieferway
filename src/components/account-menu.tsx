import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { LogoutButton } from "@/components/logout-button";

export function AccountMenu({
  user,
  locale,
  className = "",
}: {
  user: SessionUser | null;
  locale: Locale;
  className?: string;
}) {
  const copy = t(locale);

  if (!user) {
    return (
      <Link
        href="/login"
        className={`inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-muted ${className}`}
      >
        {copy.login}
      </Link>
    );
  }

  return (
    <details className={`relative ${className}`}>
      <summary className="flex h-11 cursor-pointer list-none items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-muted [&::-webkit-details-marker]:hidden">
        {copy.account}
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
        <p className="truncate px-3 py-2 text-xs text-text-secondary">{user.email}</p>
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
