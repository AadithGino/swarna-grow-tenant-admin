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
