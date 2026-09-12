import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImprintPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#111827]">Impressum</h1>

        <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#111827]">
          <h2 className="font-display text-lg font-semibold tracking-tight">Angaben gemäß § 5 DDG</h2>
          <p>
            Lieferway.de
            <br />
            Gökhan Güney
            <br />
            Waldstr. 6
            <br />
            64732 Bad König
            <br />
            Deutschland
          </p>
        </section>

        <section className="mt-8 space-y-2 text-[15px] leading-relaxed text-[#111827]">
          <h2 className="font-display text-lg font-semibold tracking-tight">Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a href="mailto:info@lieferway.de" className="font-medium text-[#E91E63] underline-offset-2 hover:underline">
              info@lieferway.de
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-2 text-[15px] leading-relaxed text-[#111827]">
          <h2 className="font-display text-lg font-semibold tracking-tight">Umsatzsteuer-ID</h2>
          <p>USt-IdNr.: DE331265637</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
