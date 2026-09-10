import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

async function signOut() {
  await clearSessionCookie();
  return new NextResponse(null, { status: 303, headers: { Location: "/" } });
}

export async function POST() {
  return signOut();
}

export async function GET() {
  return signOut();
}
