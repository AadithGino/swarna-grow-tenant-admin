import { describe, expect, it } from "vitest";
import {
  datetimeLocalValueToUtcIso,
  resolveScheduleFieldForSave,
  utcIsoToDatetimeLocalValue,
} from "@/src/lib/datetime-local";

describe("datetime-local schedule round-trip", () => {
  it("round-trips UTC through local fields without drift on title-only save", () => {
    const original = "2026-01-20T04:30:00.000Z";
    const local = utcIsoToDatetimeLocalValue(original);
    expect(resolveScheduleFieldForSave(local, original)).toBeUndefined();
  });

  it("clears schedule when local input emptied", () => {
    expect(resolveScheduleFieldForSave("", "2026-01-20T04:30:00.000Z")).toBeNull();
  });

  it("parses intentional local edit to UTC", () => {
    const local = "2026-01-25T10:00";
    const iso = datetimeLocalValueToUtcIso(local);
    expect(iso).toMatch(/2026-01-25T/);
    expect(iso?.endsWith(":00.000Z") || iso?.includes(":00.000")).toBe(true);
  });
});

describe("Asia/Kolkata wall time", () => {
  it("maps 10:00 IST input to 04:30 UTC", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      const iso = datetimeLocalValueToUtcIso("2026-06-15T10:00");
      expect(iso).toBe("2026-06-15T04:30:00.000Z");
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});

describe("process timezone round-trip", () => {
  const zones = ["UTC", "Asia/Kolkata", "America/Los_Angeles"] as const;

  for (const zone of zones) {
    it(`preserves schedule on title-only save in ${zone}`, () => {
      const previous = process.env.TZ;
      process.env.TZ = zone;
      try {
        const original = "2026-03-10T10:15:00.000Z";
        const local = utcIsoToDatetimeLocalValue(original);
        expect(resolveScheduleFieldForSave(local, original)).toBeUndefined();
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    });
  }
});
