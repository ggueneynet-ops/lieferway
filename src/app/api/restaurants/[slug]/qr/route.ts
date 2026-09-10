import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/public-origin";
import { restaurantOrderUrl } from "@/lib/slug";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { slug: true, isActive: true, name: true },
  });
  if (!restaurant || !restaurant.isActive) {
    return NextResponse.json({ error: "Restaurant nicht gefunden." }, { status: 404 });
  }

  const origin = await publicOrigin();
  const url = restaurantOrderUrl(origin, restaurant.slug);
  const wantDownload = new URL(req.url).searchParams.get("download") === "1";
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });

  const filename = `lieferway-${restaurant.slug}.png`;
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": wantDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
    },
  });
}
