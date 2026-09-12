"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";

export function StripeOnboardButton({
  complete,
  chargesEnabled,
}: {
  complete: boolean;
  chargesEnabled: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/stripe/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
      setBusy(false);
    }
  }

  const ready = complete && chargesEnabled;
  return (
    <Button className="mt-3 h-11" disabled={busy} onClick={start} variant={ready ? "outline" : "default"}>
      {busy ? t.processing : ready ? t.stripeConnectContinue : complete ? t.stripeConnectContinue : t.stripeConnectStart}
    </Button>
  );
}
