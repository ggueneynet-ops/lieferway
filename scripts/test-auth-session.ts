import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "../src/lib/constants";
import {
  applyClearedSessionCookie,
  applySessionCookie,
  authSecretBytes,
  signToken,
  verifyToken,
} from "../src/lib/auth";

async function main() {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "short";
  assert.equal(authSecretBytes().byteLength, 32, "short AUTH_SECRET must stretch to 32 bytes");

  const session = {
    id: "user_demo",
    email: "restaurant@lieferway.de",
    name: "Mehmet Demir",
    role: "RESTAURANT" as const,
    locale: "de",
  };
  const token = await signToken(session);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const verified = await verifyToken(token);
  assert.deepEqual(verified, session);
  process.env.AUTH_SECRET = previous;

  const res = applySessionCookie(NextResponse.json({ user: session, token }), token);
  const cookie = res.cookies.get(AUTH_COOKIE);
  assert.equal(cookie?.value, token);
  const setCookie = res.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`${AUTH_COOKIE}=`));
  assert.match(setCookie, /HttpOnly/i);

  const cleared = applyClearedSessionCookie(NextResponse.json({ ok: true }));
  const clearedHeader = cleared.headers.get("set-cookie") ?? "";
  assert.match(clearedHeader, new RegExp(`${AUTH_COOKIE}=`));

  console.log("auth session helpers ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
