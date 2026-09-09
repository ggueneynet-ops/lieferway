"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OrderPoller({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [id, router]);
  return null;
}
