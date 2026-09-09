import { NextResponse } from "next/server";

export function json(data: unknown, init?: number | ResponseInit) {
  const base: ResponseInit = typeof init === "number" ? { status: init } : init ?? {};
  const headers = new Headers(base.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  return NextResponse.json(data, { ...base, headers });
}

export function options() {
  return json({ ok: true });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}
