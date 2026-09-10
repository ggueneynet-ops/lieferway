import { LegalPage } from "@/components/legal-page";
import { getCopy } from "@/lib/get-locale";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const { t } = await getCopy();
  return <LegalPage title={t.privacy} body={t.privacyBody} />;
}
