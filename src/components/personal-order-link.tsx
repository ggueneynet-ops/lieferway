"use client";

import { useState } from "react";
import { Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(false);

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
      <div className="mt-3 grid gap-2">
        <Button type="button" className="h-12 w-full text-sm font-semibold" onClick={copy}>
          <Copy className="size-4" strokeWidth={2} />
          {t.rpCopyLink}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-[#E91E63]/30 text-sm font-semibold text-[#C2185B]"
          onClick={() => setOpen(true)}
        >
          <QrCode className="size-4" strokeWidth={2} />
          {t.rpShowQr}
        </Button>
        <Button type="button" variant="outline" className="h-12 w-full text-sm font-semibold" asChild>
          <a href={`${qrSrc}?download=1`} download={`lieferway-${slug}.png`}>
            <Download className="size-4" strokeWidth={2} />
            {t.rpDownloadQr}
          </a>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.rpShowQr}</DialogTitle>
            <DialogDescription>{url}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={t.rpQrAlt} width={280} height={280} className="size-[280px]" />
          </div>
          <Button type="button" className="h-12 w-full font-semibold" asChild>
            <a href={`${qrSrc}?download=1`} download={`lieferway-${slug}.png`}>
              {t.rpDownloadQr}
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
