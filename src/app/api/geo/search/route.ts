import { json, options, fail } from "@/lib/http";
import { searchAddresses } from "@/lib/geo";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return fail("q required", 400);
  const places = await searchAddresses(q);
  return json({ places });
}
