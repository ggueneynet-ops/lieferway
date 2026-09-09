import { json, options } from "@/lib/http";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  return json({ ok: true, name: "Lieferway" });
}
