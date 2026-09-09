export const SPLASH_SESSION_KEY = "lw_splash_shown";
export const SPLASH_DONE_EVENT = "lw-splash-done";

export function splashAlreadyShown() {
  try {
    return sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function notifySplashDone() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SPLASH_DONE_EVENT));
}

/** Wait until the homepage splash has faded (or been skipped) so iOS location UI is not on top of it. */
export function waitForSplashIntro(maxMs = 2200): Promise<void> {
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
