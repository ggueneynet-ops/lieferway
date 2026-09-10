import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCopy } from "@/lib/get-locale";

export async function SiteFooter() {
  const { t } = await getCopy();
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{t.footerLegal}</p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm text-text-secondary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.partner}</p>
          <Link href="/partner/anmelden" className="hover:text-ink">
            {t.becomePartner}
          </Link>
          <Link href="/login?next=/restaurant" className="hover:text-ink">
            {t.partnerLogin}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
