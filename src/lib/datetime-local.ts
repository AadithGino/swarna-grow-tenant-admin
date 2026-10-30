/** Label for datetime-local fields (browser local timezone). */
export const DATETIME_LOCAL_TIMEZONE_LABEL =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "local time";

/** UTC ISO → value for `<input type="datetime-local">` in the browser's local zone. */
export function utcIsoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Interpret datetime-local value as local wall time → UTC ISO (seconds precision, ms zeroed).
 */
export function datetimeLocalValueToUtcIso(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date/time");
  }
  d.setSeconds(0, 0);
  return d.toISOString();
}

/** Preserve schedule when editor sends unchanged local fields. */
export function resolveScheduleFieldForSave(
  localValue: string,
  originalIso: string | null | undefined,
): string | null | undefined {
  if (!localValue.trim()) {
    if (originalIso) return null;
    return undefined;
  }
  const nextIso = datetimeLocalValueToUtcIso(localValue);
  if (originalIso && nextIso === normalizeIsoMinute(originalIso)) {
    return undefined;
  }
  return nextIso;
}

function normalizeIsoMinute(iso: string): string {
  const d = new Date(iso);
  d.setSeconds(0, 0);
  return d.toISOString();
}

export function formatUtcIsoForDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const tz = DATETIME_LOCAL_TIMEZONE_LABEL;
    // dateStyle/timeStyle can't be combined with timeZoneName (throws in Chromium), so spell it out.
    const formatted = new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return `${formatted} (${tz})`;
  } catch {
    return iso;
  }
}
