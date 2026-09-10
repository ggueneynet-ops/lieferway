import {
  CUSTOMER_STATUS_FLOW,
  FULFILLMENT_COOKIE,
  PICKUP_CUSTOMER_STATUS_FLOW,
  type FulfillmentType,
  type OrderStatus,
} from "@/lib/constants";

export function parseFulfillment(value: unknown): FulfillmentType {
  return value === "PICKUP" ? "PICKUP" : "DELIVERY";
}

export function isPickup(value: unknown): boolean {
  return parseFulfillment(value) === "PICKUP";
}

/** Client-only: restaurant override, then market session, then cookie. */
export function readClientFulfillment(restaurantId?: string): FulfillmentType {
  if (typeof window === "undefined") return "DELIVERY";
  try {
    if (restaurantId) {
      const stored = window.sessionStorage.getItem(`lw_fulfill_${restaurantId}`);
      if (stored) return parseFulfillment(stored);
    }
    const global = window.sessionStorage.getItem("lw_fulfill");
    if (global) return parseFulfillment(global);
  } catch {
    /* private mode */
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${FULFILLMENT_COOKIE}=([^;]*)`));
  if (match?.[1]) return parseFulfillment(decodeURIComponent(match[1]));
  return "DELIVERY";
}

export function customerStatusFlow(fulfillment?: unknown): OrderStatus[] {
  return isPickup(fulfillment) ? PICKUP_CUSTOMER_STATUS_FLOW : CUSTOMER_STATUS_FLOW;
}

export function customerStep(status: string, fulfillment?: unknown): OrderStatus {
  if (isPickup(fulfillment)) {
    if (status === "PREPARING" || status === "ACCEPTED") return "ACCEPTED";
    if (status === "READY") return "READY";
    if (status === "DELIVERED") return "DELIVERED";
    if (status === "PLACED") return "PLACED";
    return "PLACED";
  }
  if (status === "READY") return "PREPARING";
  if ((CUSTOMER_STATUS_FLOW as string[]).includes(status)) return status as OrderStatus;
  return "PLACED";
}
