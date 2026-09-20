/** Compact axis labels — tooltips should use the full label. */
export function compactCategoryLabel(label: unknown): string {
  const s = String(label ?? "").trim();
  if (!s) return "—";
  const monthYear = s.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYear) {
    const mon = monthYear[1].slice(0, 3);
    return `${mon} '${monthYear[2].slice(-2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    return new Date(`${s}-01T12:00:00`).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  if (/^week of\s/i.test(s)) return s.replace(/^week of\s/i, "Wk ");
  if (s.length > 11) return `${s.slice(0, 10)}…`;
  return s;
}

export function categoryXAxisSettings(
  pointCount: number,
  longestLabelChars: number,
): {
  interval: number | "preserveStart" | "preserveEnd" | "preserveStartEnd";
  minTickGap: number;
  angle: number;
  textAnchor: "end" | "middle";
  height: number;
} {
  const crowded = pointCount > 4 || longestLabelChars > 8;
  const tight = pointCount > 8 || longestLabelChars > 12;

  let interval: number | "preserveStartEnd" = 0;
  if (pointCount > 14) {
    interval = "preserveStartEnd";
  } else if (pointCount > 6) {
    interval = Math.max(0, Math.ceil(pointCount / 5) - 1);
  }

  return {
    interval,
    minTickGap: tight ? 32 : crowded ? 22 : 14,
    angle: tight ? -38 : crowded ? -32 : 0,
    textAnchor: crowded ? "end" : "middle",
    height: crowded ? (tight ? 56 : 48) : 32,
  };
}

export function longestCompactLabel(
  values: unknown[],
  labelForValue: (value: unknown) => string = compactCategoryLabel,
): number {
  return values.reduce(
    (max, value) => Math.max(max, labelForValue(value).length),
    0,
  );
}
