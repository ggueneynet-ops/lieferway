export const DEFAULT_COMMISSION_PERCENT = 5;
export const AUTH_COOKIE = "lw_session";
export const LOCALE_COOKIE = "lw_locale";
export const PLZ_COOKIE = "lw_plz";
export const RADIUS_COOKIE = "lw_km";
export const LAT_COOKIE = "lw_lat";
export const LNG_COOKIE = "lw_lng";
export const CITY = "Frankfurt am Main";
export const RADIUS_PRESETS = [3, 5, 10] as const;
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_RESTAURANT_RADIUS_KM = 8;

export const ROLES = ["CUSTOMER", "RESTAURANT", "COURIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["CARD", "APPLE_PAY", "GOOGLE_PAY", "CASH"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CUISINES = [
  "Türkisch",
  "Italienisch",
  "Burger",
  "Sushi",
  "Deutsch",
  "Vietnamesisch",
  "Gesund",
  "Pizza",
] as const;

/** Food glyphs for the category rail — not a third-party brand icon set. */
export const CUISINE_ICONS: Record<(typeof CUISINES)[number] | "all", string> = {
  all: "🍽️",
  Türkisch: "🥙",
  Italienisch: "🍝",
  Burger: "🍔",
  Sushi: "🍣",
  Deutsch: "🥨",
  Vietnamesisch: "🍜",
  Gesund: "🥗",
  Pizza: "🍕",
};

export const STATUS_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
