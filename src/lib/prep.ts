export const PREP_CHIPS = [10, 20, 30, 45, 60] as const;
export const PREP_MIN = 5;
export const PREP_MAX = 180;

export function parsePrepMinutes(value: unknown): number | null {
  if (value == null || value === "") return null;
  const raw = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(raw)) return null;
  const mins = Math.round(raw);
  if (mins < PREP_MIN || mins > PREP_MAX) return null;
  return mins;
}
