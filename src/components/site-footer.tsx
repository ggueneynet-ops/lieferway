import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCopy } from "@/lib/get-locale";

export async function SiteFooter() {
  const { t } = await getCopy();
  return (
    <footer data-public-footer="legal" className="mt-auto border-t border-border bg-white">
      <div className="lw-wrap flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#111827]">{t.footerLegal}</p>
          <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-[#9CA3AF]">{t.footerDemoNote}</p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm text-text-secondary">
          <Link href="/partner/anmelden" className="hover:text-ink">
            {t.becomePartner}
          </Link>
          <Link href="/ueber" className="hover:text-ink">
            {t.about}
          </Link>
          <Link href="/hilfe" className="hover:text-ink">
            {t.help}
          </Link>
          <Link href="/datenschutz" className="hover:text-ink">
            {t.privacy}
          </Link>
          <Link href="/impressum" className="hover:text-ink">
            {t.imprint}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
