export const DEFAULT_COMMISSION_PERCENT = 8;

/** Inner-city venues with 0 € Liefergebühr during Launch Week. */
export const LAUNCH_WEEK_RESTAURANT_SLUGS = [
  "pasta-e-basta",
  "mainhattan-burger",
  "green-bowl",
] as const;

export function isLaunchWeekRestaurant(slug: string) {
  return (LAUNCH_WEEK_RESTAURANT_SLUGS as readonly string[]).includes(slug);
}
export const AUTH_COOKIE = "lw_session";
export const LOCALE_COOKIE = "lw_locale";
export const PLZ_COOKIE = "lw_plz";
export const RADIUS_COOKIE = "lw_km";
export const LAT_COOKIE = "lw_lat";
export const LNG_COOKIE = "lw_lng";
export const STREET_COOKIE = "lw_street";
export const CITY_COOKIE = "lw_city";
export const GEO_SOURCE_COOKIE = "lw_geo_source";
/** Session-only: set after a successful GPS fix this visit. Leftover `gps` cookies without this are not trusted. */
export const GEO_LIVE_COOKIE = "lw_geo_live";
export const FULFILLMENT_COOKIE = "lw_fulfill";
export function isManualGeoSource(value?: string | null) {
  return value === "manual";
}
export function isTrustedGeoSource(value?: string | null) {
  return value === "gps" || value === "manual";
}
/** SSR listing + cookie restore. Demo-seeded / leftover GPS Frankfurt is not an explicit choice. */
export function isActiveDeliveryLocation(source?: string | null, live?: string | null) {
  return source === "manual" || (source === "gps" && live === "1");
}
export const CITY = ""; // set from user location; do not hard-market a city
export const RADIUS_PRESETS = [3, 5, 10] as const;
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_RESTAURANT_RADIUS_KM = 8;

export const ROLES = ["CUSTOMER", "RESTAURANT", "COURIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
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

export const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CASH_ON_DELIVERY",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYOUT_STATUSES = ["NONE", "UNPAID", "PENDING", "PAID", "FAILED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** Kitchen / live boards never see unpaid online orders. */
export const KITCHEN_HIDDEN_STATUSES = ["PENDING_PAYMENT"] as const;
export const REPORT_UNPAID_STATUSES = ["PENDING_PAYMENT"] as const;

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

export const STATUS_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

/** Customer-facing tracker — restaurant-own delivery, no courier “ready” step. */
export const CUSTOMER_STATUS_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const FULFILLMENT_TYPES = ["DELIVERY", "PICKUP"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

/** Pickup tracker: Bestellt → Angenommen → Fertig zur Abholung → Abgeholt. */
export const PICKUP_CUSTOMER_STATUS_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "READY",
  "DELIVERED",
];

/**
 * v1: Gutschein XOR WayPoints on the same order.
 * Set ALLOW_COUPON_WAYPOINTS_STACK=true to allow future stacking.
 */
export function allowCouponWayPointsStack() {
  return process.env.ALLOW_COUPON_WAYPOINTS_STACK === "true";
}
