export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export const number = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);
export const grams = (value: number) => `${value.toFixed(3)} g`;
/** Whole-number share for charts and legends (avoids float noise in UI). */
export const percentShare = (value: number) =>
  `${Math.round(value)}%`;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const idempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** ISO `YYYY-MM-DD` → readable label for admin UI. */
export const formatIsoDate = (iso?: string | null) => {
  if (!iso) return "—";
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
