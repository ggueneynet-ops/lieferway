import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProfileCard } from "@/components/profile-card";
import { LogoutButton } from "@/components/logout-button";
import { getCopy } from "@/lib/get-locale";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBerlinDateTime } from "@/lib/datetime";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const { t, locale } = await getCopy();
  const db = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true, email: true, name: true, role: true },
  });
  if (!db) redirect("/login?next=/account");

  const notices =
    db.role === "CUSTOMER" || db.role === "ADMIN"
      ? await prisma.customerNotice.findMany({
          where: { userId: session.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [];

  return (
    <>
      <SiteHeader chrome="app" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:py-10">
        <Link
          href="/account/favorites"
          className="mb-6 flex items-center justify-between rounded-2xl border border-[#F8BBD0]/80 bg-white px-4 py-4 text-[#0F172A] shadow-sm"
        >
          <span>
            <span className="block text-[15px] font-semibold">{t.favTitle}</span>
            <span className="block text-[12px] text-[#64748B]">{t.favAccountHint}</span>
          </span>
          <span className="text-lg font-semibold text-[#E91E63]">→</span>
        </Link>
        <ProfileCard
          name={db.name}
          email={db.email}
          phone={db.phone ?? ""}
          canEdit={session.role === "CUSTOMER" || session.role === "ADMIN"}
        />
        {db.role === "CUSTOMER" || db.role === "ADMIN" ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">{t.noticesInbox}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.noticesInboxHint}</p>
            {notices.length === 0 ? (
              <p className="mt-4 rounded-2xl border bg-white px-4 py-5 text-sm text-muted-foreground">
                {t.noticesInboxEmpty}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {notices.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/orders/${n.orderId}`}
                      className={`block rounded-2xl border px-4 py-3 ${
                        n.readAt ? "bg-white" : "border-primary/20 bg-primary-soft"
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      <p className="mt-0.5 text-sm text-[#6B7280]">{n.body}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{formatBerlinDateTime(n.createdAt, locale)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        <div className="mt-auto flex justify-center pb-4 pt-10">
          <LogoutButton label={t.logout} variant="quiet" />
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}
