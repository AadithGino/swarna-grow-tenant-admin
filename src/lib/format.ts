export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

/** Settlement figures keep paise. Gold weight × rate is often not a whole rupee. */
export const moneyExact = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/** Compact rupee labels for chart axes (values already in rupees). */
export const compactMoney = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `₹${Math.round(value / 1e3)}k`;
  return money(value);
};
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
