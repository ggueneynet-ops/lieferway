import { prisma } from "@/lib/prisma";
import { json, options } from "@/lib/http";
import { listMarketplaceRestaurants } from "@/lib/marketplace";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const cuisine = searchParams.get("cuisine") ?? "";
  const plz = searchParams.get("plz") ?? "";
  const restaurants = await listMarketplaceRestaurants({ q, cuisine, plz });
  return json({ restaurants });
}
