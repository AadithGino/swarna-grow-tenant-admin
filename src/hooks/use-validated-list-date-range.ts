"use client";

import { useMemo, useState } from "react";
import {
  defaultListRangeFrom,
  defaultListRangeTo,
  validateListDateRange,
} from "@/src/lib/list-date-range";

/** List/report date range with inline validation (no throttle). */
export function useValidatedListDateRange() {
  const [from, setFrom] = useState(() => defaultListRangeFrom());
  const [to, setTo] = useState(() => defaultListRangeTo());
  const dateRangeError = useMemo(
    () => validateListDateRange(from, to),
    [from, to],
  );
  const skipForBadDates = Boolean(dateRangeError);
  return { from, setFrom, to, setTo, dateRangeError, skipForBadDates };
}
