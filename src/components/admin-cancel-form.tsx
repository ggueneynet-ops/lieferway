"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";

export function AdminCancelForm({
  orderId,
  cancellable,
}: {
  orderId: string;
  cancellable: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!cancellable) {
    return <p className="mt-1 text-sm text-text-secondary">{t.adminCancelUnavailable}</p>;
  }

  async function cancel() {
    if (!window.confirm(t.adminCancelConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.adminCancelFailed);
      toast.success(t.adminCancelSuccess);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.adminCancelFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-sm text-text-secondary">{t.adminCancelHint}</p>
      <Button type="button" disabled={busy} variant="outline" onClick={() => void cancel()}>
        {t.adminCancel}
      </Button>
    </div>
  );
}
