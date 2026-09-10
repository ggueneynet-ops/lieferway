import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{body}</p>
      </main>
      <SiteFooter />
    </>
  );
}
