import type { Role } from "@/lib/constants";

export type OrderAccessSubject = {
  customerId: string;
  courierId: string | null;
  restaurantOwnerId?: string | null;
};

/**
 * API / kitchen board: couriers may inspect unassigned READY tours to claim.
 * Customer-facing /orders/[id] should use canAccessOrderDetailPage instead.
 */
export function canViewOrder(
  role: Role,
  userId: string,
  order: OrderAccessSubject,
): boolean {
  if (role === "ADMIN") return true;
  if (role === "CUSTOMER") return order.customerId === userId;
  if (role === "COURIER") return order.courierId === userId || !order.courierId;
  if (role === "RESTAURANT") return order.restaurantOwnerId === userId;
  return false;
}

/** Customer order detail page — no cross-tenant IDOR via URL id swap. */
export function canAccessOrderDetailPage(
  role: Role,
  userId: string,
  order: OrderAccessSubject,
): boolean {
  if (role === "ADMIN") return true;
  if (role === "CUSTOMER") return order.customerId === userId;
  if (role === "RESTAURANT") return order.restaurantOwnerId === userId;
  if (role === "COURIER") return order.courierId === userId;
  return false;
}

/** Payment client_secret only for the paying customer (or admin support). */
export function canAccessOrderPayment(
  role: Role,
  userId: string,
  order: { customerId: string },
): boolean {
  if (role === "ADMIN") return true;
  return order.customerId === userId;
}
