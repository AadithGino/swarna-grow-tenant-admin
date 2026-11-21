import { describe, expect, it } from "vitest";
import { bookingNextStep, bookingStageIndex, timeLeftShort } from "@/src/features/ecommerce/ecommerce-booking-ui";

const now = Date.parse("2026-11-18T10:00:00Z");
const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

describe("bookingNextStep", () => {
  it("puts a failed refund ahead of the booking's own stage", () => {
    expect(bookingNextStep({ status: "CANCELLED", refunds: [{ status: "FAILED" }] }, now)).toMatchObject({ owner: "STAFF", tone: "danger", label: "Refund failed" });
  });
  it("asks staff to send a refund that is assigned but not dispatched", () => {
    expect(bookingNextStep({ status: "CANCELLED", refunds: [{ status: "ASSIGNED" }] }, now)).toMatchObject({ owner: "STAFF", label: "Send the refund" });
  });
  it("tells staff to bill a confirmed booking while the booked rate still holds", () => {
    const step = bookingNextStep({ status: "CONFIRMED", rateProtectedUntil: inHours(5), balanceDueAt: inHours(60) }, now);
    expect(step).toMatchObject({ owner: "STAFF", label: "Prepare the final bill", detail: "Booked rate for 5 h" });
  });
  it("falls back to the balance deadline once rate protection has ended", () => {
    const step = bookingNextStep({ status: "CONFIRMED", rateProtectedUntil: inHours(-1), balanceDueAt: inHours(60) }, now);
    expect(step.detail).toMatch(/^Bill by /);
  });
  it("shows the customer's remaining time while a payment is due", () => {
    expect(bookingNextStep({ status: "BALANCE_PENDING", balanceDueAt: inHours(50) }, now)).toMatchObject({ owner: "CUSTOMER", detail: "2 days left" });
    expect(bookingNextStep({ status: "PENDING_ADVANCE", advanceDueAt: inHours(0.25) }, now).detail).toBe("15 min left");
  });
});

describe("timeLeftShort", () => {
  it("says overdue after the deadline and nothing without one", () => {
    expect(timeLeftShort(inHours(-2), now)).toBe("overdue");
    expect(timeLeftShort(null, now)).toBeNull();
  });
});

describe("bookingStageIndex", () => {
  it("tracks completed stages and stops for closed bookings", () => {
    expect(bookingStageIndex("PENDING_ADVANCE")).toBe(0);
    expect(bookingStageIndex("BALANCE_PENDING")).toBe(2);
    expect(bookingStageIndex("CONVERTED")).toBe(3);
    expect(bookingStageIndex("EXPIRED")).toBeNull();
  });
});
