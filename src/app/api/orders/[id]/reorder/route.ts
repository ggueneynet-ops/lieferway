import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { buildReorderPreview } from "@/lib/reorder";

export async function OPTIONS() {
  return options();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const { id } = await params;
    const preview = await buildReorderPreview({
      orderId: id,
      customerId: session.id,
      isAdmin: session.role === "ADMIN",
    });
    if ("error" in preview) return fail(preview.error, preview.status);
    return json(preview);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    throw e;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return GET(req, ctx);
}
