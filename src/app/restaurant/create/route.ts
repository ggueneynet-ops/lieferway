import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

/** Restaurants cannot self-register. Only admin creates restaurant + owner. */
async function bounce() {
  const session = await getSession();
  if (!session) return redirectTo("/login?next=/restaurant");
  if (session.role === "ADMIN") return redirectTo("/admin/restaurants");
  return redirectTo("/restaurant");
}

export async function GET() {
  return bounce();
}

export async function POST() {
  return bounce();
}
