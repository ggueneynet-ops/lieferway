import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCopy } from "@/lib/get-locale";

export async function SiteFooter() {
  const { t } = await getCopy();
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{t.footerLegal}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-text-secondary">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.partner}</p>
          <Link href="/partner/anmelden" className="hover:text-ink">
            {t.becomePartner}
          </Link>
          <Link href="/login?next=/restaurant" className="hover:text-ink">
            {t.partnerLogin}
          </Link>
          <Link href="/login?next=/courier" className="hover:text-ink">
            {t.forCouriers}
          </Link>
          <Link href="/login?next=/admin" className="hover:text-ink">
            {t.adminPanel}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
