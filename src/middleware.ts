import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/constants";
import { pathIs } from "@/lib/paths";

/** Public marketplace — never treat `/restaurants/:slug` as the staff `/restaurant` panel. */
const PUBLIC = ["/restaurants", "/cart", "/partner"];

const PROTECTED = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/restaurant", roles: ["RESTAURANT", "ADMIN"] },
  { prefix: "/courier", roles: ["COURIER", "ADMIN"] },
  { prefix: "/checkout", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/orders", roles: ["CUSTOMER", "ADMIN", "RESTAURANT", "COURIER"] },
  { prefix: "/account", roles: ["CUSTOMER", "ADMIN", "RESTAURANT", "COURIER"] },
];

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
        },
      });
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res;
  }

  const pathname = req.nextUrl.pathname;
  if (PUBLIC.some((p) => pathIs(pathname, p))) {
    return NextResponse.next();
  }

  const rule = PROTECTED.find((p) => pathIs(pathname, p.prefix));
  if (rule) {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/cart",
    "/checkout",
    "/login/:path*",
    "/register",
    "/account/:path*",
    "/restaurants/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/restaurant/:path*",
    "/courier/:path*",
    "/partner/:path*",
    "/api/:path*",
    "/:slug",
  ],
};
