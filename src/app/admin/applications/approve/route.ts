import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { approvePartnerApplication } from "@/lib/partner-application";

function redirectTo(path: string) {
  revalidatePath("/admin/applications");
  revalidatePath("/admin/restaurants");
  revalidatePath("/");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: Request) {
  try {
    await requireSession(["ADMIN"]);
  } catch {
    return redirectTo("/login?next=/admin/applications");
  }

  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const result = await approvePartnerApplication(id, {
    slug: String(form.get("slug") ?? ""),
  });
  if ("error" in result) {
    return redirectTo(`/admin/applications?error=${encodeURIComponent(result.error ?? "error")}`);
  }
  return redirectTo(
    `/admin/applications?ok=approved&email=${encodeURIComponent(result.restaurant.owner.email)}&name=${encodeURIComponent(result.restaurant.name)}`,
  );
}
