"use server";

import { redirect } from "next/navigation";
import { authenticate, setSessionCookie, signToken } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  const session = await authenticate(email, password);
  if (!session) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await setSessionCookie(await signToken(session));
  const dest =
    session.role === "ADMIN"
      ? "/admin"
      : session.role === "RESTAURANT"
        ? "/restaurant"
        : session.role === "COURIER"
          ? "/courier"
          : next.startsWith("/")
            ? next
            : "/";
  redirect(dest);
}
