import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PhoneCaptureForm } from "@/components/phone-capture-form";
import { getCopy } from "@/lib/get-locale";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PhoneCapturePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    const q = await searchParams;
    const next = q.next?.startsWith("/") ? q.next : "/";
    redirect(`/login?next=${encodeURIComponent(`/account/phone?next=${encodeURIComponent(next)}`)}`);
  }
  const q = await searchParams;
  const next = q.next?.startsWith("/") && !q.next.startsWith("//") ? q.next : "/";
  const { t } = await getCopy();
  const db = await prisma.user.findUnique({
    where: { id: session!.id },
    select: { phone: true },
  });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">{t.addPhoneTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.addPhoneLead}</p>
      <PhoneCaptureForm initialPhone={db?.phone ?? ""} next={next} />
    </div>
  );
}
