"use server";

import { redirect } from "next/navigation";
import { authenticate, setSessionCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withPhoneGate } from "@/lib/phone";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  const session = await authenticate(email, password);
  if (!session) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await setSessionCookie(await signToken(session));
  const db = await prisma.user.findUnique({
    where: { id: session.id },
    select: { phone: true, role: true },
  });
  const dest = withPhoneGate(next.startsWith("/") ? next : "/", db?.phone, db?.role ?? session.role);
  redirect(dest);
}
