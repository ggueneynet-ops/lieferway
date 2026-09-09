import { NextResponse } from "next/server";
import { submitPartnerApplication } from "@/lib/partner-application";

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET() {
  return redirectTo("/partner/anmelden");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const result = await submitPartnerApplication({
    businessName: String(form.get("businessName") ?? ""),
    cuisine: String(form.get("cuisine") ?? ""),
    street: String(form.get("street") ?? ""),
    postalCode: String(form.get("postalCode") ?? ""),
    city: String(form.get("city") ?? ""),
    contactName: String(form.get("contactName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    website: String(form.get("website") ?? ""),
    message: String(form.get("message") ?? ""),
  });

  if ("error" in result) {
    const code = result.error === "duplicate" ? "duplicate" : encodeURIComponent(result.error ?? "error");
    return redirectTo(`/partner/anmelden?error=${code}`);
  }

  return redirectTo("/partner/anmelden?ok=1");
}
