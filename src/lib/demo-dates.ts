/** Demo data uses Sep 2026–aligned display strings; map them to ISO dates for range filters. */
export const DEMO_RANGE_FROM = "2026-09-01";
/** Demo “today” in KAIRALI seed narratives (Sep 2026). */
export const DEMO_TODAY = "2026-09-15";
export const DEMO_RANGE_TO = DEMO_TODAY;

export function demoDayFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("today")) return DEMO_TODAY;
  if (lower.includes("yesterday")) return "2026-09-13";
  const sep = text.match(/(\d{1,2})\s+Sep(?:\s*,|\s+2026|\s*$)/i);
  if (sep) return `2026-09-${sep[1].padStart(2, "0")}`;
  const jan = text.match(/(\d{1,2})\s+Jan\s+2027/i);
  if (jan) return `2027-01-${jan[1].padStart(2, "0")}`;
  const mar = text.match(/(\d{1,2})\s+Mar\s+2028/i);
  if (mar) return `2028-03-${mar[1].padStart(2, "0")}`;
  const aug = text.match(/(\d{1,2})\s+Aug\s+2026/i);
  if (aug) return `2026-08-${aug[1].padStart(2, "0")}`;
  return null;
}

export function matchesDemoDateRange(
  text: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;
  const start = from ?? "1970-01-01";
  const end = to ?? "2099-12-31";
  const day = demoDayFromText(text);
  if (!day) return true;
  return day >= start && day <= end;
}
