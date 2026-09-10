import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProfileCard } from "@/components/profile-card";
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
      <SiteHeader chrome="app" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:py-10">
        <ProfileCard
          name={db.name}
          email={db.email}
          phone={db.phone ?? ""}
          canEdit={session.role === "CUSTOMER" || session.role === "ADMIN"}
        />
        <div className="mt-auto flex justify-center pb-4 pt-10">
          <LogoutButton label={t.logout} variant="quiet" />
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
