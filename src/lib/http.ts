import { NextResponse } from "next/server";

export function json(data: unknown, init?: number | ResponseInit) {
  const base: ResponseInit = typeof init === "number" ? { status: init } : init ?? {};
  const { headers: incoming, ...rest } = base;
  const res = NextResponse.json(data, rest);
  if (incoming) {
    new Headers(incoming).forEach((value, key) => {
      res.headers.set(key, value);
    });
  }
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  return res;
}

export function options() {
  return json({ ok: true });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}
