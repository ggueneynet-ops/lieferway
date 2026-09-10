import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePrepMinutes } from "@/lib/prep";
import { eurosToCents } from "@/lib/money";

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

function fail(message: string) {
  return redirectTo("/restaurant/delivery?error=" + encodeURIComponent(message));
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return redirectTo("/login?next=/restaurant/delivery");
    if (session.role !== "RESTAURANT" && session.role !== "ADMIN") {
      return redirectTo("/");
    }

    const form = await req.formData();
    const owned = await prisma.restaurant.findUnique({ where: { ownerId: session.id } });
    const id =
      owned?.id ??
      (session.role === "ADMIN" ? String(form.get("id") ?? "") : "");
    if (!id) return fail("Restaurant nicht gefunden.");

    const etaMin = parsePrepMinutes(form.get("etaMin"));
    const etaMax = parsePrepMinutes(form.get("etaMax"));
    if (etaMin == null || etaMax == null || etaMin > etaMax) {
      return fail("Lieferzeit: 5–180 Minuten, „von“ nicht größer als „bis“.");
    }

    const minOrderRaw = String(form.get("minOrderEuro") ?? "").trim();
    const feeRaw = String(form.get("deliveryFeeEuro") ?? "").trim();
    if (!minOrderRaw || !feeRaw) return fail("Mindestbestellwert und Liefergebühr angeben.");
    const minOrderCents = eurosToCents(minOrderRaw);
    const deliveryFeeCents = eurosToCents(feeRaw);
    if (!Number.isFinite(minOrderCents) || minOrderCents < 0 || minOrderCents > 50_000) {
      return fail("Mindestbestellwert prüfen.");
    }
    if (!Number.isFinite(deliveryFeeCents) || deliveryFeeCents < 0 || deliveryFeeCents > 20_000) {
      return fail("Liefergebühr prüfen.");
    }

    const pickupAllowed = form.get("pickupAllowed") === "1";
    const launchWeekFreeDelivery = form.get("launchWeekFreeDelivery") === "1";

    await prisma.$executeRaw`
      UPDATE "Restaurant"
      SET "etaMin" = ${etaMin},
          "etaMax" = ${etaMax},
          "minOrderCents" = ${minOrderCents},
          "deliveryFeeCents" = ${deliveryFeeCents},
          "pickupAllowed" = ${pickupAllowed ? 1 : 0},
          "launchWeekFreeDelivery" = ${launchWeekFreeDelivery ? 1 : 0}
      WHERE "id" = ${id}
    `;

    const updated = await prisma.restaurant.findUnique({
      where: { id },
      select: { slug: true },
    });

    revalidatePath("/");
    revalidatePath("/suchen");
    revalidatePath("/restaurant/delivery");
    if (updated?.slug) revalidatePath(`/restaurants/${updated.slug}`);
    return redirectTo("/restaurant/delivery?ok=delivery");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return redirectTo("/login?next=/restaurant/delivery");
    console.error("POST /restaurant/delivery/save", e);
    return fail(msg && msg !== "FORBIDDEN" ? msg : "Speichern fehlgeschlagen.");
  }
}
