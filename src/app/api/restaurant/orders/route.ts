import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { loadKitchenSnapshot, resolveKitchenRestaurant } from "@/lib/restaurant-live";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  if (session.role !== "RESTAURANT" && session.role !== "ADMIN") {
    return fail("Keine Berechtigung.", 403);
  }
  const restaurantId = new URL(req.url).searchParams.get("restaurantId");
  const restaurant = await resolveKitchenRestaurant({
    userId: session.id,
    role: session.role,
    restaurantId,
  });
  if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
  if (session.role === "RESTAURANT" && restaurant.ownerId !== session.id) {
    return fail("Keine Berechtigung.", 403);
  }
  const snapshot = await loadKitchenSnapshot(restaurant.id);
  if (!snapshot) return fail("Kein Restaurant verknüpft.", 404);
  return json(snapshot);
}
