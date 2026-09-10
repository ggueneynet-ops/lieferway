import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export function parseLogoUrl(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return "invalid";
  }
  return "invalid";
}

export async function saveRestaurantLogoFile(file: File, restaurantId: string): Promise<string | { error: string }> {
  if (!file || file.size === 0) return { error: "empty" };
  if (file.size > MAX_BYTES) return { error: "too-large" };
  const ext = TYPES[file.type];
  if (!ext) return { error: "type" };
  const safeId = restaurantId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "logo";
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  const filename = `${safeId}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);
  return `/uploads/logos/${filename}`;
}
