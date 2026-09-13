import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import type { LegalBlock } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen von Lieferway.",
};

const blocks: LegalBlock[] = [
  { type: "h1", text: "Allgemeine Geschäftsbedingungen" },
  {
    type: "p",
    spans: [
      {
        type: "text",
        text: "Die vollständigen Allgemeinen Geschäftsbedingungen werden hier veröffentlicht, sobald der endgültige Vertragstext vorliegt.",
      },
    ],
  },
  {
    type: "p",
    spans: [
      {
        type: "text",
        text: "Fragen dazu: ",
      },
      { type: "link", text: "info@lieferway.de", href: "mailto:info@lieferway.de" },
      { type: "text", text: "." },
    ],
  },
];

export default function AgbPage() {
  return <LegalDocument title="AGB" blocks={blocks} />;
}
