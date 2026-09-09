import { prisma } from "@/lib/prisma";
import { fail, json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.isActive) return fail("Gutschein ungültig.");
  return json({ coupon });
}
