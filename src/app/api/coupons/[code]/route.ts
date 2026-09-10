import { prisma } from "@/lib/prisma";
import { fail, json, options } from "@/lib/http";
import { couponBelowMinimum } from "@/lib/orders";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.isActive) return fail("Gutschein ungültig.");

  const subtotalRaw = new URL(req.url).searchParams.get("subtotal");
  const subtotal = subtotalRaw == null || subtotalRaw === "" ? Number.NaN : Number(subtotalRaw);
  if (Number.isFinite(subtotal) && couponBelowMinimum(subtotal, coupon)) {
    return json(
      {
        error: "min_not_met",
        minSubtotalCents: coupon.minSubtotalCents,
        coupon: { code: coupon.code },
      },
      400,
    );
  }

  return json({ coupon });
}
