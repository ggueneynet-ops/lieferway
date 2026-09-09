"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { markSplashShown, notifySplashDone, splashAlreadyShown } from "@/lib/splash";

const HOLD_MS = 1500;
const FADE_MS = 350;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SplashIntro() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"in" | "out" | "hidden">("in");
  const holdTimer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    markSplashShown();
    notifySplashDone();
    setPhase("out");
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      notifySplashDone();
      setPhase("hidden");
      return;
    }
    if (splashAlreadyShown()) {
      notifySplashDone();
      setPhase("hidden");
      return;
    }

    holdTimer.current = window.setTimeout(dismiss, HOLD_MS);
    return () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    };
  }, [dismiss]);

  useLayoutEffect(() => {
    if (phase !== "out") return;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    fadeTimer.current = window.setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <button
      type="button"
      aria-label={t.tapToSkip}
      onClick={dismiss}
      className={`lw-splash fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 px-6 ${
        phase === "out" ? "lw-splash-out" : ""
      }`}
    >
      <span className="lw-splash-mark">
        <img
          src="/logo-master-a.png?v=4"
          alt="Lieferway"
          width={260}
          height={198}
          draggable={false}
          className="mx-auto h-auto w-[min(68vw,260px)]"
        />
      </span>
      <span className="text-center text-[13px] font-medium text-[#FCE4EC]">
        {t.tagline}
      </span>
      <span className="absolute bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.25rem))] text-[11px] font-medium text-white/70">
        {t.tapToSkip}
      </span>
    </button>
  );
}
