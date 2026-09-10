import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { acceptKitchenOrder } from "@/lib/kitchen-accept";

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const body = (await req.json().catch(() => null)) as {
      orderId?: string;
      prepMinutes?: number | string;
    } | null;
    if (!body?.orderId) return fail("Bestellung fehlt.");
    const result = await acceptKitchenOrder({
      orderId: body.orderId,
      ownerUserId: session.id,
      role: session.role,
      prepMinutes: body.prepMinutes,
    });
    if ("error" in result) return fail(result.error, result.status);
    return json({ ok: true, order: result.order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("POST /api/restaurant/orders/accept", e);
    return fail(e instanceof Error && e.message ? e.message : "Annehmen fehlgeschlagen.", 500);
  }
}
