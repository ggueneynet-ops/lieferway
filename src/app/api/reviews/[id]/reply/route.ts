import { requireSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { reply?: string } | null;
    const reply = body?.reply?.trim() ?? "";
    if (reply.length < 1) return fail("Bitte eine Antwort eingeben.");
    if (reply.length > 800) return fail("Antwort ist zu lang.");

    const review = await prisma.review.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!review) return fail("Bewertung nicht gefunden.", 404);
    if (session.role === "RESTAURANT" && review.restaurant.ownerId !== session.id) {
      return fail("Keine Berechtigung.", 403);
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { reply, repliedAt: new Date() },
    });
    return json({ ok: true, review: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("POST /api/reviews/[id]/reply", e);
    return fail("Antwort konnte nicht gespeichert werden.", 500);
  }
}
