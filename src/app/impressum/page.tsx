import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { loadLegalMarkdown, parseLegalMarkdown } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum von Lieferway gemäß § 5 DDG.",
};

export default async function ImprintPage() {
  const md = await loadLegalMarkdown("impressum");
  return <LegalDocument title="Impressum" blocks={parseLegalMarkdown(md)} />;
}
