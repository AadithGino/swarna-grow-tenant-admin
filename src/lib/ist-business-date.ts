/** YYYY-MM-DD in Asia/Kolkata — for admin date fields defaulting to “today”. */
export function istBusinessDateToday(reference = new Date()): string {
  return reference.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
