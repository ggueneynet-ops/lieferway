type Listener = (restaurantId: string) => void;

const g = globalThis as unknown as { __lwOrderBus?: Set<Listener> };
if (!g.__lwOrderBus) g.__lwOrderBus = new Set();

export function notifyRestaurantOrders(restaurantId: string) {
  for (const fn of g.__lwOrderBus!) {
    try {
      fn(restaurantId);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function subscribeRestaurantOrders(fn: Listener) {
  g.__lwOrderBus!.add(fn);
  return () => {
    g.__lwOrderBus!.delete(fn);
  };
}
