import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { loadLegalMarkdown, parseLegalMarkdown } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen von Lieferway.",
};

export default async function AgbPage() {
  const md = await loadLegalMarkdown("agb");
  return <LegalDocument title="AGB" blocks={parseLegalMarkdown(md)} />;
}
