import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { setApplicationStatus } from "@/lib/partner-application";

function redirectTo(path: string) {
  revalidatePath("/admin/applications");
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
  const status = String(form.get("status") ?? "");
  if (status !== "CONTACTED" && status !== "REJECTED") {
    return redirectTo("/admin/applications?error=" + encodeURIComponent("Status ungültig."));
  }
  const result = await setApplicationStatus(id, status);
  if ("error" in result) {
    return redirectTo(`/admin/applications?error=${encodeURIComponent(result.error ?? "error")}`);
  }
  return redirectTo("/admin/applications?ok=status");
}
