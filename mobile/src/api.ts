const DEFAULT_API = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:43123";

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function apiUrl() {
  return DEFAULT_API;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${DEFAULT_API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
};

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  etaMin: number;
  etaMax: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  categories?: { id: string; name: string; items: MenuItem[] }[];
};
