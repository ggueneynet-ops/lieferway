import { getSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import { loadKitchenSnapshot, resolveKitchenRestaurant } from "@/lib/restaurant-live";
import { subscribeRestaurantOrders } from "@/lib/order-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return fail("Bitte anmelden.", 401);
  if (session.role !== "RESTAURANT" && session.role !== "ADMIN") {
    return fail("Keine Berechtigung.", 403);
  }
  const restaurantIdParam = new URL(req.url).searchParams.get("restaurantId");
  const restaurant = await resolveKitchenRestaurant({
    userId: session.id,
    role: session.role,
    restaurantId: restaurantIdParam,
  });
  if (!restaurant) return fail("Kein Restaurant verknüpft.", 404);
  if (session.role === "RESTAURANT" && restaurant.ownerId !== session.id) {
    return fail("Keine Berechtigung.", 403);
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastSig = "";

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const ping = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      };

      const push = async () => {
        if (closed) return;
        const snapshot = await loadKitchenSnapshot(restaurant.id);
        if (!snapshot || snapshot.signature === lastSig) return;
        lastSig = snapshot.signature;
        send(snapshot);
      };

      void push();
      const poll = setInterval(() => {
        void push();
      }, 2500);
      const heartbeat = setInterval(ping, 15000);
      const unsub = subscribeRestaurantOrders((id) => {
        if (id === restaurant.id) void push();
      });

      const shutdown = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", shutdown);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
