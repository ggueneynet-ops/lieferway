"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { markSplashShown, notifySplashDone, splashAlreadyShown } from "@/lib/splash";

/** Auto-hide after 1.1s. Tap/skip removes the overlay on the same frame. */
const HOLD_MS = 1100;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SplashIntro() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    if (prefersReducedMotion() || splashAlreadyShown()) return false;
    return true;
  });
  const holdTimer = useRef<number | null>(null);
  const gone = useRef(false);

  const dismissNow = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    markSplashShown();
    notifySplashDone();
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || splashAlreadyShown()) {
      gone.current = true;
      markSplashShown();
      notifySplashDone();
      setVisible(false);
      return;
    }
    holdTimer.current = window.setTimeout(dismissNow, HOLD_MS);
    return () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    };
  }, [dismissNow]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label={t.tapToSkip}
      onPointerDown={dismissNow}
      onClick={dismissNow}
      className="lw-splash fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 px-6"
    >
      <span className="lw-splash-mark">
        <img
          src="/Lieferway-splash-lockup.png?v=18"
          alt="Lieferway"
          width={835}
          height={200}
          draggable={false}
          className="mx-auto h-auto w-[min(88vw,420px)]"
        />
      </span>
      <span className="absolute bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.25rem))] text-[11px] font-medium text-[#9CA3AF]">
        {t.tapToSkip}
      </span>
    </button>
  );
}
