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

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function watchOnce(options: PositionOptions, waitMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let done = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (done) return;
        done = true;
        navigator.geolocation.clearWatch(id);
        window.clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        if (done) return;
        done = true;
        navigator.geolocation.clearWatch(id);
        window.clearTimeout(timer);
        reject(err);
      },
      options,
    );
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(id);
      reject({ code: 3, message: "Timeout" });
    }, waitMs);
  });
}

/**
 * Must be called directly from a tap/click (Safari). Starts GPS in the same turn —
 * do not await anything before calling this.
 */
export function requestDeviceCoords(): Promise<GeoResult> {
  if (typeof window === "undefined") return Promise.resolve({ ok: false, error: "unavailable" });
  if (!window.isSecureContext) return Promise.resolve({ ok: false, error: "insecure" });
  if (!navigator.geolocation) return Promise.resolve({ ok: false, error: "unsupported" });

  return (async () => {
    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 18_000,
        maximumAge: 0,
      });
      return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      if (kindFromError(err) === "denied") return { ok: false, error: "denied" };
    }

    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 60_000,
      });
      return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      if (kindFromError(err) === "denied") return { ok: false, error: "denied" };
    }

    try {
      const pos = await watchOnce(
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
        16_000,
      );
      return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      return { ok: false, error: kindFromError(err) };
    }
  })();
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
