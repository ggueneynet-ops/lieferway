import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

async function signOut(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", req.url), 303);
}

export async function POST(req: Request) {
  return signOut(req);
}

export async function GET(req: Request) {
  return signOut(req);
}
