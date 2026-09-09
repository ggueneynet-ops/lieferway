import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Lieferway GmbH i.G. · Frankfurt am Main · Demo ohne echten Zahlungsverkehr.
            Restaurant-Provision standardmäßig 5 % auf Speisen. Auszahlung montags.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-text-secondary">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Partner</p>
          <Link href="/login?next=/restaurant" className="hover:text-ink">
            Für Restaurants
          </Link>
          <Link href="/login?next=/courier" className="hover:text-ink">
            Für Kuriere
          </Link>
          <Link href="/login?next=/admin" className="hover:text-ink">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}
