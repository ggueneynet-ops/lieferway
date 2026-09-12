import { NextResponse } from "next/server";
import { applyClearedSessionCookie, logSafeError } from "@/lib/auth";

async function signOut(req: Request) {
  try {
    return applyClearedSessionCookie(NextResponse.redirect(new URL("/", req.url), 303));
  } catch (err) {
    logSafeError("logout", err);
    return NextResponse.redirect(new URL("/", req.url), 303);
  }
}

export async function POST(req: Request) {
  return signOut(req);
}

export async function GET(req: Request) {
  return signOut(req);
}
