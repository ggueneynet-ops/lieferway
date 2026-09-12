import { NextResponse } from "next/server";
import { applyClearedSessionCookie, logSafeError } from "@/lib/auth";
import { requestOrigin } from "@/lib/public-origin";

async function signOut(req: Request) {
  const home = new URL("/", requestOrigin(req));
  try {
    return applyClearedSessionCookie(NextResponse.redirect(home, 303));
  } catch (err) {
    logSafeError("logout", err);
    return NextResponse.redirect(home, 303);
  }
}

export async function POST(req: Request) {
  return signOut(req);
}

export async function GET(req: Request) {
  return signOut(req);
}
