import { env } from "@/src/config/env";
import {
  DEMO_RANGE_FROM,
  DEMO_RANGE_TO,
  DEMO_TODAY,
} from "@/src/lib/demo-dates";

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default “from” for list/report date filters (demo range in mock mode). */
export function defaultListRangeFrom(): string {
  if (env.useMocks) return DEMO_RANGE_FROM;
  const now = new Date();
  return formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** Default “to” for list/report date filters. */
export function defaultListRangeTo(): string {
  if (env.useMocks) return DEMO_RANGE_TO;
  return formatLocalYmd(new Date());
}

/** Business calendar day (IST) — matches backend gold rate / due date logic. */
export function businessTodayYmd(): string {
  if (env.useMocks) return DEMO_TODAY;
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Calendar “today” highlight (demo day in mock mode). */
export function appTodayYmd(): string {
  return businessTodayYmd();
}

export function applyThisMonthRange(): { from: string; to: string } {
  return { from: defaultListRangeFrom(), to: defaultListRangeTo() };
}

/** Wide list preset: full demo span in mocks, else calendar year. */
export function applyWideListRangePreset(): { from: string; to: string } {
  if (env.useMocks) {
    return { from: DEMO_RANGE_FROM, to: DEMO_RANGE_TO };
  }
  const year = new Date().getFullYear();
  return {
    from: formatLocalYmd(new Date(year, 0, 1)),
    to: formatLocalYmd(new Date(year, 11, 31)),
  };
}

export function wideListRangePresetLabel(): string {
  return env.useMocks ? "All demo" : "Full year";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(date: string): Date | null {
  if (!ISO_DATE.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Validates YYYY-MM-DD pair for list/report/audit filters (from ≤ to). */
export function validateListDateRange(
  from: string,
  to: string,
): string | undefined {
  const fromTrim = from.trim();
  const toTrim = to.trim();
  if (!fromTrim || !toTrim) {
    return "Choose both start and end dates.";
  }
  if (!ISO_DATE.test(fromTrim) || !ISO_DATE.test(toTrim)) {
    return "Use date format YYYY-MM-DD.";
  }
  const fromDt = parseIsoDate(fromTrim);
  const toDt = parseIsoDate(toTrim);
  if (!fromDt || !toDt) {
    return "Enter valid calendar dates.";
  }
  if (fromDt.getTime() > toDt.getTime()) {
    return "Start date must be on or before end date.";
  }
  return undefined;
}

export const LIST_SEARCH_QUERY_MAX = 120;

export function validateListSearchQuery(q: string): string | undefined {
  if (q.length > LIST_SEARCH_QUERY_MAX) {
    return `Search must be ${LIST_SEARCH_QUERY_MAX} characters or fewer.`;
  }
  return undefined;
}

export function sanitizeListSearchQueryInput(raw: string): string {
  return raw.slice(0, LIST_SEARCH_QUERY_MAX);
}

/** Trimmed query for list API `q` param; omit when empty or over limit. */
export function listSearchQueryForApi(q: string): string | undefined {
  const trimmed = q.trim();
  if (!trimmed || validateListSearchQuery(trimmed)) return undefined;
  return trimmed;
}

/** Skip fetching when debounced search exceeds backend max length. */
export function shouldSkipListSearchQuery(q: string): boolean {
  const trimmed = q.trim();
  if (!trimmed) return false;
  return Boolean(validateListSearchQuery(trimmed));
}
