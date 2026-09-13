"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/locale-provider";
import {
  CUSTOMER_NOTIF_PROMPT_KEY,
  getNotificationPermission,
  getSoftPromptState,
  isSecureNotificationContext,
  notifyCustomerBrowserNotice,
  requestNotificationPermission,
  setSoftPromptState,
} from "@/lib/browser-notifications";

type Notice = {
  id: string;
  orderId: string;
  status: string;
  title: string;
  body: string;
};

function offerCustomerPermission(t: {
  browserNotifEnable: string;
  customerNotifEnableHint: string;
  browserNotifEnableBtn: string;
  browserNotifLater: string;
  browserNotifDenied: string;
  browserNotifInsecure: string;
}) {
  if (getSoftPromptState(CUSTOMER_NOTIF_PROMPT_KEY) !== "unknown") return;
  if (!isSecureNotificationContext()) return;
  const perm = getNotificationPermission();
  if (perm !== "default") return;

  toast(t.browserNotifEnable, {
    id: "lw-customer-notif-prompt",
    description: t.customerNotifEnableHint,
    duration: 12000,
    action: {
      label: t.browserNotifEnableBtn,
      onClick: () => {
        void (async () => {
          setSoftPromptState(CUSTOMER_NOTIF_PROMPT_KEY, "asked");
          const result = await requestNotificationPermission();
          if (result === "denied") toast.error(t.browserNotifDenied);
        })();
      },
    },
    cancel: {
      label: t.browserNotifLater,
      onClick: () => setSoftPromptState(CUSTOMER_NOTIF_PROMPT_KEY, "dismissed"),
    },
  });
}

export function CustomerNoticePoller() {
  const pathname = usePathname();
  const router = useRouter();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const seen = new Set<string>();
    let primed = false;
    let stopped = false;
    let offeredPrompt = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/notices", { cache: "no-store", credentials: "include" });
        if (stopped || res.status === 401) return;
        if (!res.ok) return;
        const data = (await res.json()) as { notices?: Notice[] };
        const notices = data.notices ?? [];
        let fresh = false;
        for (const n of notices) {
          if (seen.has(n.id)) continue;
          seen.add(n.id);
          if (!primed) continue;
          fresh = true;
          const onOrderPage = pathRef.current.startsWith(`/orders/${n.orderId}`);
          if (!onOrderPage) {
            const show = n.status === "REJECTED" || n.status === "CANCELLED" || n.status === "REFUNDED"
              ? toast.error
              : toast.success;
            show(n.title, {
              id: n.id,
              description: n.body,
              duration: 9000,
            });
          }
          // Browser Notification when subscribed (deduped by notice id; prefers hidden tab).
          notifyCustomerBrowserNotice({
            noticeId: n.id,
            orderId: n.orderId,
            title: n.title,
            body: n.body,
          });
        }
        primed = true;
        if (fresh) {
          const path = pathRef.current;
          if (path === "/orders" || path.startsWith("/account") || path.startsWith("/orders/")) {
            router.refresh();
          }
          if (!offeredPrompt) {
            offeredPrompt = true;
            offerCustomerPermission(tRef.current);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 4000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}
