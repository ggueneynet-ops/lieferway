/**
 * Pure checkout edge-case guards (server + unit tests).
 * Keep commission / money math elsewhere — this only validates cart/checkout inputs.
 */
import { normalizePlz } from "./plz";
import {
  distanceFromOrigin,
  resolveOrigin,
  restaurantCoversDistance,
} from "./radius";

export const CHECKOUT_ERROR = {
  RESTAURANT_CLOSED: "RESTAURANT_CLOSED",
  RESTAURANT_UNAVAILABLE: "RESTAURANT_UNAVAILABLE",
  ITEM_UNAVAILABLE: "ITEM_UNAVAILABLE",
  PRICE_CHANGED: "PRICE_CHANGED",
  MIN_ORDER: "MIN_ORDER",
  INVALID_PLZ: "INVALID_PLZ",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  OUT_OF_AREA: "OUT_OF_AREA",
  FEE_CHANGED: "FEE_CHANGED",
  STALE_CART: "STALE_CART",
} as const;

export type CheckoutErrorCode = (typeof CHECKOUT_ERROR)[keyof typeof CHECKOUT_ERROR];

export function normalizeIdempotencyKey(raw?: string | null): string | null {
  if (raw == null) return null;
  const key = String(raw).trim();
  if (key.length < 8 || key.length > 80) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return null;
  return key;
}

/** German 5-digit PLZ required for delivery. */
export function assertValidDeliveryPlz(raw?: string | null):
  | { ok: true; plz: string }
  | { ok: false; code: typeof CHECKOUT_ERROR.INVALID_PLZ; error: string } {
  const plz = normalizePlz(raw);
  if (!plz || !/^\d{5}$/.test(plz)) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.INVALID_PLZ,
      error: "Ungültige PLZ. Bitte eine 5-stellige deutsche Postleitzahl angeben.",
    };
  }
  return { ok: true, plz };
}

export function assertDeliveryAddress(opts: {
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
}):
  | { ok: true; street: string; city: string; postalCode: string }
  | {
      ok: false;
      code: typeof CHECKOUT_ERROR.INVALID_ADDRESS | typeof CHECKOUT_ERROR.INVALID_PLZ;
      error: string;
    } {
  const street = (opts.street ?? "").trim();
  const city = (opts.city ?? "").trim();
  if (street.length < 3 || city.length < 2) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.INVALID_ADDRESS,
      error: "Bitte eine vollständige Lieferadresse (Straße und Ort) angeben.",
    };
  }
  const plzCheck = assertValidDeliveryPlz(opts.postalCode);
  if (!plzCheck.ok) return plzCheck;
  return { ok: true, street, city, postalCode: plzCheck.plz };
}

export function assertMinOrder(
  foodSubtotalCents: number,
  minOrderCents: number,
): { ok: true } | { ok: false; code: typeof CHECKOUT_ERROR.MIN_ORDER; error: string } {
  if (foodSubtotalCents < minOrderCents) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.MIN_ORDER,
      error: "Mindestbestellwert nicht erreicht.",
    };
  }
  return { ok: true };
}

/**
 * Delivery radius / service-area check.
 * Uses restaurant maxDeliveryKm when coords exist; otherwise RestaurantServiceArea PLZ list.
 * User marketplace search radius is intentionally ignored at order time.
 */
export function assertDeliveryCoverage(opts: {
  postalCode: string;
  restaurant: {
    lat: number | null;
    lng: number | null;
    maxDeliveryKm: number | null | undefined;
    serviceAreas: { postalCode: string }[];
  };
}): { ok: true } | { ok: false; code: typeof CHECKOUT_ERROR.OUT_OF_AREA; error: string } {
  const plz = normalizePlz(opts.postalCode);
  if (!plz) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.OUT_OF_AREA,
      error: "Lieferung an diese Adresse / PLZ ist nicht möglich.",
    };
  }
  const servesPlz = opts.restaurant.serviceAreas.some((a) => a.postalCode === plz);
  const origin = resolveOrigin({ plz });
  const distanceKm = distanceFromOrigin(origin, opts.restaurant.lat, opts.restaurant.lng);
  const covered = restaurantCoversDistance(
    distanceKm,
    null,
    opts.restaurant.maxDeliveryKm,
    plz,
    servesPlz,
  );
  if (!covered) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.OUT_OF_AREA,
      error: "Lieferung an diese Adresse / PLZ ist nicht möglich.",
    };
  }
  // If restaurant has explicit service areas and no distance-based cap applied,
  // require PLZ membership when areas are configured.
  const hasAreas = opts.restaurant.serviceAreas.length > 0;
  const hasRadius =
    typeof opts.restaurant.maxDeliveryKm === "number" && opts.restaurant.maxDeliveryKm > 0;
  if (hasAreas && !hasRadius && !servesPlz) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.OUT_OF_AREA,
      error: "Lieferung an diese Adresse / PLZ ist nicht möglich.",
    };
  }
  return { ok: true };
}

export type PriceLineInput = {
  menuItemId: string;
  quantity: number;
  expectedPriceCents?: number | null;
};

export type MenuPriceRow = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
};

/**
 * Ensure every requested line exists, is available, and (when expected) price matches DB.
 */
export function assertCartLinesAgainstMenu(opts: {
  requested: PriceLineInput[];
  menuItems: MenuPriceRow[];
}):
  | {
      ok: true;
      lines: { menuItemId: string; name: string; priceCents: number; quantity: number }[];
    }
  | {
      ok: false;
      code:
        | typeof CHECKOUT_ERROR.ITEM_UNAVAILABLE
        | typeof CHECKOUT_ERROR.PRICE_CHANGED
        | typeof CHECKOUT_ERROR.STALE_CART;
      error: string;
      changed?: { menuItemId: string; name: string; expectedPriceCents: number; currentPriceCents: number }[];
    } {
  if (opts.menuItems.length !== opts.requested.length) {
    const found = new Set(opts.menuItems.map((m) => m.id));
    const missing = opts.requested.some((r) => !found.has(r.menuItemId));
    return {
      ok: false,
      code: missing ? CHECKOUT_ERROR.ITEM_UNAVAILABLE : CHECKOUT_ERROR.STALE_CART,
      error: missing
        ? "Ein Artikel ist nicht mehr verfügbar (ausverkauft)."
        : "Warenkorb ist veraltet. Bitte Seite neu laden.",
    };
  }

  const changed: {
    menuItemId: string;
    name: string;
    expectedPriceCents: number;
    currentPriceCents: number;
  }[] = [];

  const lines = opts.requested.map((line) => {
    const item = opts.menuItems.find((m) => m.id === line.menuItemId)!;
    if (
      typeof line.expectedPriceCents === "number" &&
      Number.isFinite(line.expectedPriceCents) &&
      line.expectedPriceCents !== item.priceCents
    ) {
      changed.push({
        menuItemId: item.id,
        name: item.name,
        expectedPriceCents: line.expectedPriceCents,
        currentPriceCents: item.priceCents,
      });
    }
    return {
      menuItemId: item.id,
      name: item.name,
      priceCents: item.priceCents,
      quantity: line.quantity,
    };
  });

  if (changed.length) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.PRICE_CHANGED,
      error: "Preise haben sich geändert. Bitte Warenkorb aktualisieren.",
      changed,
    };
  }

  return { ok: true, lines };
}

export function assertDeliveryFeeMatches(
  serverFeeCents: number,
  expectedFeeCents?: number | null,
): { ok: true } | { ok: false; code: typeof CHECKOUT_ERROR.FEE_CHANGED; error: string } {
  if (typeof expectedFeeCents !== "number" || !Number.isFinite(expectedFeeCents)) {
    return { ok: true };
  }
  if (expectedFeeCents !== serverFeeCents) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.FEE_CHANGED,
      error: "Liefergebühr hat sich geändert. Bitte Warenkorb aktualisieren.",
    };
  }
  return { ok: true };
}

export function restaurantAcceptingOrders(opts: {
  isActive: boolean;
  isOpen: boolean;
  wantsPreorder: boolean;
  preorderEnabled: boolean;
}):
  | { ok: true }
  | {
      ok: false;
      code: typeof CHECKOUT_ERROR.RESTAURANT_CLOSED | typeof CHECKOUT_ERROR.RESTAURANT_UNAVAILABLE;
      error: string;
    } {
  if (!opts.isActive) {
    return {
      ok: false,
      code: CHECKOUT_ERROR.RESTAURANT_UNAVAILABLE,
      error: "Restaurant nimmt gerade keine Bestellungen an.",
    };
  }
  if (!opts.wantsPreorder && !opts.isOpen) {
    if (opts.preorderEnabled) {
      return {
        ok: false,
        code: CHECKOUT_ERROR.RESTAURANT_CLOSED,
        error: "Restaurant ist geschlossen — bitte eine Vorbestell-Zeit wählen.",
      };
    }
    return {
      ok: false,
      code: CHECKOUT_ERROR.RESTAURANT_CLOSED,
      error: "Restaurant nimmt gerade keine Bestellungen an.",
    };
  }
  return { ok: true };
}
