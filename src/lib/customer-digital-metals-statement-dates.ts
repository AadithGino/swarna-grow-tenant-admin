/** Default metal-statement window in IST business dates (YYYY-MM-DD). */

function istYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function defaultStatementDateRange(reference = new Date()): { from: string; to: string } {
  const to = istYmd(reference);
  const start = new Date(reference);
  start.setUTCDate(start.getUTCDate() - 30);
  const from = istYmd(start);
  return { from, to };
}
