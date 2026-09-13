import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HelpCenter } from "@/components/help-center";
import { LegalInlineText } from "@/components/legal-inline";
import { loadLegalMarkdown, parseHelpMarkdown } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner-Hilfe",
  description: "Hilfe für Lieferway-Partner: Provision, Lieferung, Auszahlung und WayPoints.",
};

export default async function PartnerHelpPage() {
  const doc = parseHelpMarkdown(await loadLegalMarkdown("partner-hilfe"));
  return (
    <>
      <SiteHeader chrome="app" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-12">
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-[#0F172A] sm:text-3xl">
          {doc.title}
        </h1>
        {doc.intro.length ? (
          <p className="mt-3 text-[15px] leading-relaxed text-[#111827]">
            <LegalInlineText spans={doc.intro} />
          </p>
        ) : null}
        <div className="mt-6">
          <HelpCenter
            doc={doc}
            searchLabel="Partner-Hilfe durchsuchen"
            searchPlaceholder="Thema suchen…"
            emptyLabel="Keine Treffer. Anderen Begriff versuchen oder info@lieferway.de schreiben."
          />
        </div>
      </main>
      <SiteFooter partner />
    </>
  );
}
