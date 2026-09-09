export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let s = trimmed.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("0") && !s.startsWith("00")) s = `+49${s.slice(1)}`;
  if (!s.startsWith("+")) {
    if (s.startsWith("49") && s.length >= 10) s = `+${s}`;
    else if (/^\d{6,15}$/.test(s)) s = `+49${s.replace(/^0/, "")}`;
    else return null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return s;
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
