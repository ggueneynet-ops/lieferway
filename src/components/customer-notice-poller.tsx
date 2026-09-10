"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

type Notice = {
  id: string;
  orderId: string;
  status: string;
  title: string;
  body: string;
};

export function CustomerNoticePoller() {
  const pathname = usePathname();
  const router = useRouter();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const seen = new Set<string>();
    let primed = false;
    let stopped = false;

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
          if (onOrderPage) continue;
          const show = n.status === "REJECTED" ? toast.error : toast.success;
          show(n.title, {
            id: n.id,
            description: n.body,
            duration: 9000,
          });
        }
        primed = true;
        if (fresh) {
          const path = pathRef.current;
          if (path === "/orders" || path.startsWith("/account") || path.startsWith("/orders/")) {
            router.refresh();
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
