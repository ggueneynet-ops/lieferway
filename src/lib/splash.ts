export const SPLASH_SESSION_KEY = "lw_splash_shown";
export const SPLASH_COOKIE = "lw_splash_shown";
export const SPLASH_DONE_EVENT = "lw-splash-done";

export function splashAlreadyShown() {
  try {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  try {
    if (typeof document !== "undefined" && document.cookie.split("; ").includes(`${SPLASH_COOKIE}=1`)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
  try {
    document.cookie = `${SPLASH_COOKIE}=1;path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function notifySplashDone() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SPLASH_DONE_EVENT));
}

/** Wait until the homepage splash is gone (or skipped) so iOS location UI is not on top of it. */
export function waitForSplashIntro(maxMs = 1200): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  if (splashAlreadyShown()) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      window.removeEventListener(SPLASH_DONE_EVENT, done);
      resolve();
    };
    const timer = window.setTimeout(done, maxMs);
    window.addEventListener(SPLASH_DONE_EVENT, done);
  });
}
