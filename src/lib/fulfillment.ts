import {
  CUSTOMER_STATUS_FLOW,
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
