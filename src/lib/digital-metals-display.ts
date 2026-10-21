/** Customer/staff-facing formatting — API stays in paise / micrograms. */

export function formatDeliveryAddressSnapshot(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "";
  const parts = [
    snapshot.recipientName,
    snapshot.line1,
    snapshot.line2,
    [snapshot.city, snapshot.state, snapshot.pincode].filter(Boolean).join(", "),
  ]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean);
  return parts.join(" · ");
}

export function ugToGramsDisplay(ug: number | string): string {
  const grams = Number(ug) / 1_000_000;
  if (!Number.isFinite(grams)) return "—";
  if (grams >= 100) return `${grams.toFixed(2)} g`;
  if (grams >= 1) return `${grams.toFixed(3)} g`;
  return `${grams.toFixed(4)} g`;
}

export function paiseToRupeeInput(paise: number | string | null | undefined): string {
  if (paise == null || paise === "") return "";
  const p = Number(paise);
  if (!Number.isFinite(p)) return "";
  return String(p / 100);
}

export function rupeeInputToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

export function formatInrFromPaise(paise: number | null | undefined): string {
  if (paise == null || !Number.isFinite(Number(paise))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(paise) / 100);
}

export function formatInrPerGramFromPaise(paise: number | null | undefined): string {
  const formatted = formatInrFromPaise(paise);
  return formatted === "—" ? formatted : `${formatted}/g`;
}

export function purityLabel(finenessPpm: number): string {
  if (finenessPpm >= 999_000) return "99.9%";
  return `${(finenessPpm / 10_000).toFixed(2)}%`;
}
