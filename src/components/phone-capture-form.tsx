"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/phone";

export function PhoneCaptureForm({
  initialPhone = "",
  next = "/",
  submitLabel,
}: {
  initialPhone?: string;
  next?: string;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizePhone(phone)) {
      toast.error(t.phoneInvalid);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/phone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? t.phoneInvalid);
      return;
    }
    toast.success(t.phoneSaved);
    const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="phone">{t.phoneNumber}</Label>
        <Input
          id="phone"
          className="mt-1 h-12 text-base"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+49 171 …"
        />
        <p className="mt-1.5 text-sm text-muted-foreground">{t.phoneHint}</p>
      </div>
      <Button className="h-12 w-full text-base" type="submit" disabled={busy}>
        {submitLabel ?? t.savePhone}
      </Button>
    </form>
  );
}
