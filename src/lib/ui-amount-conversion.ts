/** UI rupees/grams ↔ API paise/micrograms (integer storage unchanged). */

const UG_PER_G = 1_000_000;

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "number" ? rupees : Number(String(rupees).trim().replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error("amountRupees must be finite");
  return Math.round(n * 100);
}

export function paiseToRupeesNumber(paise: number): number {
  return Math.round(paise) / 100;
}

export function formatRupeesFromPaise(paise: number): string {
  return `₹${paiseToRupeesNumber(paise).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function gramsToUg(grams: number | string): number {
  const n = typeof grams === "number" ? grams : Number(String(grams).trim());
  if (!Number.isFinite(n)) throw new Error("quantityGrams must be finite");
  return Math.round(n * UG_PER_G);
}

export function ugToGramsNumber(ug: number): number {
  return Number(ug) / UG_PER_G;
}

export function formatGramsFromUg(ug: number | string): string {
  const g = ugToGramsNumber(Number(ug));
  if (!Number.isFinite(g)) return "—";
  if (g >= 1000) return `${(g / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
  return `${g.toLocaleString("en-IN", { maximumFractionDigits: 6 })} g`;
}
