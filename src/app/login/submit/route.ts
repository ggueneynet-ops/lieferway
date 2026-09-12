import { NextResponse } from "next/server";
import { applySessionCookie, authenticate, logSafeError, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withPhoneGate } from "@/lib/phone";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const password = String(form?.get("password") ?? "");
  const next = String(form?.get("next") ?? "/") || "/";
  const origin = new URL(req.url).origin;
  const fail = new URL("/login", origin);
  fail.searchParams.set("error", "1");
  fail.searchParams.set("next", next);

  try {
    const session = await authenticate(email, password);
    if (!session) {
      return NextResponse.redirect(fail, 303);
    }
    const token = await signToken(session);
    const db = await prisma.user.findUnique({
      where: { id: session.id },
      select: { phone: true, role: true },
    });
    const dest = withPhoneGate(next.startsWith("/") ? next : "/", db?.phone, db?.role ?? session.role);
    return applySessionCookie(NextResponse.redirect(new URL(dest, origin), 303), token);
  } catch (err) {
    logSafeError("auth.loginSubmit", err);
    return NextResponse.redirect(fail, 303);
  }
}
