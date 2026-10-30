/** YYYY-MM-DD in Asia/Kolkata — for admin date fields defaulting to “today”. */
export function istBusinessDateToday(reference = new Date()): string {
  return reference.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** First day of the current IST month as YYYY-MM-DD. */
export function istMonthStart(reference = new Date()): string {
  return `${istBusinessDateToday(reference).slice(0, 7)}-01`;
}

/** Current IST month so far: 1st of the month → today. */
export function istMonthToDateRange(reference = new Date()): { from: string; to: string } {
  return { from: istMonthStart(reference), to: istBusinessDateToday(reference) };
}
