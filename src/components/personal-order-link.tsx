"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

export function PersonalOrderLink({
  slug,
  origin,
}: {
  slug: string;
  origin: string;
}) {
  const { t } = useI18n();
  const url = `${origin.replace(/\/$/, "")}/${slug}`;
  const qrSrc = `/api/restaurants/${encodeURIComponent(slug)}/qr`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.rpLinkCopied);
    } catch {
      toast.error(t.error);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E91E63]/20 bg-white p-4">
      <h2 className="text-[15px] font-semibold text-[#111827]">{t.rpPersonalLink}</h2>
      <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{t.rpPersonalLinkHint}</p>
      <p className="mt-3 break-all rounded-xl bg-[#FCE4EC] px-3 py-2.5 text-[13px] font-medium text-[#C2185B]">
        {url}
      </p>
      <div className="mt-3 flex justify-center rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt={t.rpQrAlt} width={200} height={200} className="size-[200px]" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button type="button" className="h-12 w-full text-sm font-semibold" onClick={copy}>
          <Copy className="size-4" strokeWidth={2} />
          {t.rpCopyLink}
        </Button>
        <Button type="button" variant="outline" className="h-12 w-full text-sm font-semibold" asChild>
          <a href={`${qrSrc}?download=1`} download={`lieferway-${slug}.png`}>
            <Download className="size-4" strokeWidth={2} />
            {t.rpDownloadQr}
          </a>
        </Button>
      </div>
    </section>
  );
}
