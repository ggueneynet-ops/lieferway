import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { loadLegalMarkdown, parseLegalMarkdown } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung von Lieferway. Stand September 2026.",
};

export default async function PrivacyPage() {
  const md = await loadLegalMarkdown("datenschutz");
  return <LegalDocument title="Datenschutz" blocks={parseLegalMarkdown(md)} />;
}
