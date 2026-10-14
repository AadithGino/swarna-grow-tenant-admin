import { describe, expect, it } from "vitest";
import { createPickerSessionGuard, productPickerAvailability } from "@/src/lib/banner-picker-session";

describe("banner-picker-session", () => {
  it("invalidates in-flight work after bump", () => {
    const session = createPickerSessionGuard();
    const token = session.current();
    session.bump();
    expect(session.isCurrent(token)).toBe(false);
    expect(session.isCurrent(session.current())).toBe(true);
  });

  it("treats only published products as available targets", () => {
    expect(productPickerAvailability("PUBLISHED")).toBe("published");
    expect(productPickerAvailability("DRAFT")).toBe("unavailable");
  });
});
