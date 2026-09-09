/** DE-first phone: 0… → +49, prefer +49…; other E.164 still allowed. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let s = trimmed.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("0")) s = `+49${s.slice(1)}`;
  if (!s.startsWith("+")) {
    if (s.startsWith("49") && s.length >= 11) s = `+${s}`;
    else if (/^\d{10,11}$/.test(s)) s = `+49${s}`;
    else return null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.startsWith("49")) {
    // Germany: 49 + 9–11 national digits (no trunk 0)
    if (digits.length < 11 || digits.length > 13) return null;
    return `+49 ${digits.slice(2)}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

export function customerNeedsPhone(phone?: string | null, role?: string) {
  if (role && role !== "CUSTOMER") return false;
  return !normalizePhone(phone ?? "");
}

export function phoneCapturePath(next = "/") {
  const n = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return `/account/phone?next=${encodeURIComponent(n)}`;
}

export function withPhoneGate(next: string, phone?: string | null, role?: string) {
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (customerNeedsPhone(phone, role ?? "CUSTOMER")) return phoneCapturePath(dest);
  return dest;
}
