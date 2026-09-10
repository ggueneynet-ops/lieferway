import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PhoneCaptureForm } from "@/components/phone-capture-form";
import { LogoutButton } from "@/components/logout-button";
import { getCopy } from "@/lib/get-locale";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const { t } = await getCopy();
  const db = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true, email: true, name: true, role: true },
  });
  if (!db) redirect("/login?next=/account");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink">{t.profile}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{db.email}</p>
        <p className="mt-4 text-sm text-ink">
          {t.name}: <span className="font-medium">{db.name}</span>
        </p>
        {session.role === "CUSTOMER" ? (
          <>
            <p className="mt-6 text-sm text-muted-foreground">{t.addPhoneLead}</p>
            <PhoneCaptureForm initialPhone={db.phone ?? ""} next="/account" submitLabel={t.save} />
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            {t.phoneNumber}: {db.phone || "—"}
          </p>
        )}
        <div className="mt-10">
          <LogoutButton label={t.logout} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
