"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { authenticate, logSafeError, setSessionCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withPhoneGate } from "@/lib/phone";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  const failUrl = `/login?error=1&next=${encodeURIComponent(next)}`;
  try {
    const session = await authenticate(email, password);
    if (!session) {
      redirect(failUrl);
    }
    const token = await signToken(session);
    await setSessionCookie(token);
    const db = await prisma.user.findUnique({
      where: { id: session.id },
      select: { phone: true, role: true },
    });
    const dest = withPhoneGate(next.startsWith("/") ? next : "/", db?.phone, db?.role ?? session.role);
    redirect(dest);
  } catch (err) {
    unstable_rethrow(err);
    logSafeError("auth.loginAction", err);
    redirect(failUrl);
  }
}
