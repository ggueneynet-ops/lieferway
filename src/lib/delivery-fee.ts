export function listedDeliveryFeeCents(r: {
  deliveryFeeCents: number;
  launchWeekFreeDelivery?: boolean | null;
}) {
  return r.launchWeekFreeDelivery ? 0 : r.deliveryFeeCents;
}
