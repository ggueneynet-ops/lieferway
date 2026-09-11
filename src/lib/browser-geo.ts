export type GeoErrorKind = "denied" | "unavailable" | "timeout" | "unsupported" | "insecure";

export type GeoResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: GeoErrorKind };

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
