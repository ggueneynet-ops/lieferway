import { fail, json, options } from "@/lib/http";
import { expireStalePlacedOrders } from "@/lib/payment-lifecycle";
import { restaurantAcceptTimeoutMinutes } from "@/lib/constants";

export async function OPTIONS() {
  return options();
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Deny in production-like envs without secret; allow local when unset + NODE_ENV development
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

/** Vercel cron / manual: expire PLACED orders past RESTAURANT_ACCEPT_TIMEOUT_MINUTES. */
export async function GET(req: Request) {
  if (!authorized(req)) return fail("Unauthorized", 401);
  try {
    const result = await expireStalePlacedOrders(50);
    return json({
      ok: true,
      timeoutMinutes: restaurantAcceptTimeoutMinutes(),
      ...result,
    });
  } catch (e) {
    console.error("cron expire-orders", e);
    return fail(e instanceof Error ? e.message : "expire failed", 500);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
