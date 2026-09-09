import { json, options } from "@/lib/http";
import { clientIpFromHeaders, plzFromIp } from "@/lib/geo";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const found = await plzFromIp(ip);
  if (!found) return json({ plz: null, ip: ip ? "set" : "local" });
  return json({ ...found, source: "ip" });
}
