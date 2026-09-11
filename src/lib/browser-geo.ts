import { GEO_ATTEMPTED_KEY } from "@/lib/geo";

export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "unsupported" | "insecure";

export type GeoResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: GeoErrorKind };

export type GeoTapResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; code: number; message: string };

/** Leftover keys we never write. Always strip them so Safari does not reuse a denied flag. */
const DENIAL_KEYS = [
  GEO_ATTEMPTED_KEY,
  "permissionDenied",
  "lw_geo_denied",
  "lw_permission_denied",
  "lw_geo_permission",
];

export function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Safari/i.test(ua)) return false;
  if (/Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS|OPR|Android/i.test(ua)) return false;
  const vendor = navigator.vendor || "";
  if (vendor && !/Apple/i.test(vendor)) return false;
  return true;
}

function clearDenialCookie(name: string) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax${secure}`;
}

/** Never persist permissionDenied. Call on boot, pageshow, and GPS success. */
export function wipeStaleGeoDenial() {
  if (typeof window === "undefined") return;
  try {
    for (const key of DENIAL_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
  try {
    for (const key of DENIAL_KEYS) window.sessionStorage.removeItem(key);
  } catch {
    /* private mode */
  }
  for (const key of DENIAL_KEYS) clearDenialCookie(key);
}

function kindFromError(err: unknown): GeoErrorKind {
  const code = typeof err === "object" && err && "code" in err ? Number((err as GeolocationPositionError).code) : NaN;
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  if (code === 2) return "unavailable";
  return "unavailable";
}

/**
 * Starts GPS in this turn (required on iPhone Safari). Do not await anything
 * before calling this. Not a watch — one getCurrentPosition only.
 */
export function requestDeviceCoords(opts?: { force?: boolean }): Promise<GeoResult> {
  if (typeof window === "undefined") return Promise.resolve({ ok: false, error: "unavailable" });
  if (!window.isSecureContext) return Promise.resolve({ ok: false, error: "insecure" });
  if (!navigator.geolocation) return Promise.resolve({ ok: false, error: "unsupported" });

  const run = () =>
    new Promise<GeoResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => resolve({ ok: false, error: kindFromError(err) }),
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: opts?.force ? 0 : 15_000 },
      );
    });

  return run();
}

/**
 * Safari tap path: call getCurrentPosition immediately. No permissions.query,
 * no storage, no cached denied short-circuit.
 */
export function getCurrentPositionFromTap(): Promise<GeoTapResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, code: -1, message: "Geolocation API missing" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        resolve({
          ok: false,
          code: err.code,
          message: err.message || `GeolocationPositionError ${err.code}`,
        }),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}

export function formatGeoPositionError(code: number, message: string) {
  const name =
    code === 1 ? "PERMISSION_DENIED" : code === 2 ? "POSITION_UNAVAILABLE" : code === 3 ? "TIMEOUT" : "ERROR";
  const detail = (message || "").trim();
  return detail ? `${code} ${name} — ${detail}` : `${code} ${name}`;
}

export function geoErrorMessage(
  kind: GeoErrorKind,
  t: {
    geoDenied: string;
    geoUnavailable: string;
    geoTimeout: string;
    geoInsecure: string;
    geoFailed: string;
  },
) {
  if (kind === "denied") return t.geoDenied;
  if (kind === "timeout") return t.geoTimeout;
  if (kind === "insecure") return t.geoInsecure;
  if (kind === "unsupported") return t.geoUnavailable;
  return t.geoUnavailable || t.geoFailed;
}
