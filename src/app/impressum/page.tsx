import { LegalPage } from "@/components/legal-page";
import { getCopy } from "@/lib/get-locale";

export const dynamic = "force-dynamic";

export default async function ImprintPage() {
  const { t } = await getCopy();
  return <LegalPage title={t.imprint} body={t.imprintBody} />;
}
