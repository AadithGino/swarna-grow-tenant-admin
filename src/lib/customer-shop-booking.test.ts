import { describe, expect, it } from "vitest";
import {
  bookingQuoteSignature,
  bookingRequestBody,
  clearPendingBooking,
  isDefinitiveBookingFailure,
  loadPendingBooking,
  rateProtectionCopy,
  savePendingBooking,
  selectBookableBranch,
  attemptForStage, bookingAttemptKey, bookingPayAction, bookingPaymentHint, excessAdvanceLabel, bookingPollMs, formatWindow, bookingRefundNotice, bookingSteps, bookingStatusLabel, canCancelBooking, estimateCancellation,
} from "@/src/lib/customer-shop-booking";

describe("customer booking rules", () => {
  it("offers the advance while it is due, the balance when billed, and nothing in between", () => {
    const pending = bookingPayAction({ status: "PENDING_ADVANCE", advance: { requiredPaise: 25_750 }, advanceDueAt: "2026-01-01" });
    expect(pending).toMatchObject({ kind: "ADVANCE", amountPaise: 25_750, label: "Pay advance" });
    expect(bookingPayAction({ status: "CONFIRMED", advance: { requiredPaise: 25_750, capturedPaise: 25_750 } })).toBeNull();
    const billed = bookingPayAction({ status: "BALANCE_PENDING", balance: { requiredPaise: 70_000 }, balanceDueAt: "2026-02-01" });
    expect(billed).toMatchObject({ kind: "BALANCE", amountPaise: 70_000 });
    expect(bookingPayAction({ status: "CONVERTED" })).toBeNull();
    expect(bookingPayAction({ status: "PENDING_ADVANCE", advance: { requiredPaise: 0 } })).toBeNull();
  });

  it("walks the four stages and stops them all on cancel or expiry", () => {
    expect(bookingSteps({ status: "CONFIRMED" }).map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(bookingSteps({ status: "BALANCE_PENDING" }).map((s) => s.state)).toEqual(["done", "done", "current", "upcoming"]);
    expect(bookingSteps({ status: "CONVERTED" }).every((s) => s.state === "done")).toBe(true);
    expect(bookingSteps({ status: "EXPIRED" }).every((s) => s.state === "stopped")).toBe(true);
  });

  it("estimates the cancellation fee the way the server rounds it", () => {
    expect(estimateCancellation({ advance: { capturedPaise: 25_750 }, policy: { cancellationFeeBps: 1000 } }))
      .toEqual({ capturedPaise: 25_750, feePaise: 2_575, refundPaise: 23_175 });
    expect(estimateCancellation({ advance: { capturedPaise: 0 }, policy: { cancellationFeeBps: 1000 } }).refundPaise).toBe(0);
    expect(estimateCancellation({ advance: { capturedPaise: 999 }, policy: { cancellationFeeBps: 0 } }).feePaise).toBe(0);
  });

  it("words the refund from the booking's refund status, never from provider detail", () => {
    expect(bookingRefundNotice({ refundStatus: "NONE", refunds: [] })).toBeNull();
    const pending = bookingRefundNotice({ refundStatus: "PENDING", refunds: [{ id: "r", amountPaise: 23_175, status: "ASSIGNED" }] });
    expect(pending).toMatchObject({ tone: "info", amountPaise: 23_175 });
    expect(bookingRefundNotice({ refundStatus: "SETTLED", refunds: [{ id: "r", amountPaise: 100, status: "SUCCEEDED" }] })?.tone).toBe("ok");
    const failed = bookingRefundNotice({ refundStatus: "FAILED", refunds: [] });
    expect(failed?.tone).toBe("warn");
    expect(failed?.detail).not.toMatch(/provider|PhonePe|rejected/i);
  });

  it("polls while a booking is open or its refund is moving, and stops when nothing can change", () => {
    expect(bookingPollMs({ status: "PENDING_ADVANCE" })).toBe(5_000);
    expect(bookingPollMs({ status: "CANCELLED", refundStatus: "PENDING" })).toBe(5_000);
    expect(bookingPollMs({ status: "CANCELLED", refundStatus: "SETTLED" })).toBe(0);
    expect(bookingPollMs({ status: "CONVERTED", refundStatus: "NONE" })).toBe(0);
    expect(bookingPollMs(undefined)).toBe(5_000);
  });

  it("labels statuses and gates cancel", () => {
    expect(bookingStatusLabel("BALANCE_PENDING")).toBe("Balance due");
    expect(bookingStatusLabel("SOMETHING_NEW")).toBe("In progress");
    expect(canCancelBooking({ status: "CONFIRMED" })).toBe(true);
    expect(canCancelBooking({ status: "CONVERTED" })).toBe(false);
  });

  it("words a window in the largest whole unit", () => {
    expect(formatWindow(30)).toBe("30 minutes");
    expect(formatWindow(120)).toBe("2 hours");
    expect(formatWindow(3 * 1440)).toBe("3 days");
    expect(formatWindow(1440)).toBe("1 day");
  });

  it("tells the customer how long the rate is protected and what applies afterwards", () => {
    const booked = rateProtectionCopy({ rateRule: "BOOKED_RATE", rateProtectionHours: 24, balanceWindowHours: 72 });
    expect(booked).toMatch(/held for 1 day after you pay the advance/);
    expect(booked).toMatch(/billed after that/);
    expect(booked).toMatch(/gold rate on the day the store bills you/);
    expect(rateProtectionCopy({ rateRule: "BOOKED_RATE", rateProtectionHours: 72, balanceWindowHours: 72 })).toMatch(/until your balance is due/);
    expect(rateProtectionCopy({ rateRule: "BOOKED_RATE", rateProtectionHours: 0, balanceWindowHours: 72 })).toMatch(/billing day/);
    expect(rateProtectionCopy({ rateRule: "BILLING_DAY", rateProtectionHours: 48, balanceWindowHours: 72 })).toMatch(/billing day/);
    const lower = rateProtectionCopy({ rateRule: "LOWER_OF_BOOKED_AND_BILLING_DAY", rateProtectionHours: 12, balanceWindowHours: 72 });
    expect(lower).toMatch(/12 hours/);
    expect(lower).toMatch(/lower/);
    expect(booked).not.toMatch(/locked/);
  });


  it("describes a payment attempt without gateway jargon", () => {
    expect(bookingPaymentHint({ status: "SUCCEEDED" })).toMatch(/received/);
    expect(bookingPaymentHint({ status: "INITIATED" })).toMatch(/in progress/);
    expect(bookingPaymentHint({ status: "FAILED" })).toMatch(/try again/);
    expect(bookingPaymentHint(null)).toBeNull();
    expect(bookingPaymentHint({ status: "WHATEVER" })).toBeNull();
  });

  it("never reads the paid advance attempt as the balance attempt", () => {
    const advance = { id: "a1", purpose: "BOOKING_ADVANCE", status: "SUCCEEDED" };
    const balance = { id: "a2", purpose: "BOOKING_BALANCE", status: "INITIATED" };
    expect(attemptForStage(advance, "BALANCE")).toBeNull();
    expect(attemptForStage(balance, "BALANCE")).toBe(balance);
    expect(attemptForStage(advance, "ADVANCE")).toBe(advance);
    expect(attemptForStage(advance, undefined)).toBeNull();
    expect(attemptForStage({ status: "SUCCEEDED" } as { purpose?: unknown }, "BALANCE")).toBeNull();
    expect(bookingAttemptKey("b1", "ADVANCE")).not.toBe(bookingAttemptKey("b1", "BALANCE"));
  });

  it("calls excess advance refunded only after it is sent", () => {
    expect(excessAdvanceLabel("SETTLED")).toMatch(/\(refunded\)/);
    for (const status of ["NONE", "PENDING", "FAILED", undefined]) expect(excessAdvanceLabel(status)).toMatch(/will be refunded/);
  });
});

describe("selectBookableBranch", () => {
  const mk = (id: string) => ({ id, name: id, preview: {} });
  it("falls past an ineligible default branch to one that can take the booking", () => {
    // The customer's own branch ("home") is not in the bookable list at all.
    expect(selectBookableBranch([mk("b2"), mk("b3")], "", "home")?.id).toBe("b2");
  });
  it("prefers the customer's choice, then their own branch, and is empty when none qualify", () => {
    expect(selectBookableBranch([mk("b2"), mk("b3")], "b3", "b2")?.id).toBe("b3");
    expect(selectBookableBranch([mk("b2"), mk("b3")], "", "b3")?.id).toBe("b3");
    expect(selectBookableBranch([mk("b2")], "gone")?.id).toBe("b2");
    expect(selectBookableBranch([], "", "b1")).toBeUndefined();
  });
});

describe("pending booking submission", () => {
  const quote = { productId: "p", pickupBranchId: "b", policyVersionId: "v", advanceRequiredPaise: 1_699_500, estimateTotalPaise: 6_798_000, ratePerGramPaise: 600_000 };
  const scope = { tenantSlug: "kairali", customerId: "cust_1", productId: "p" };
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  };

  it("binds acceptance to the rate and estimate, not only the advance", () => {
    const base = bookingQuoteSignature(quote);
    expect(bookingQuoteSignature({ ...quote, ratePerGramPaise: 650_000 })).not.toBe(base);
    expect(bookingQuoteSignature({ ...quote, estimateTotalPaise: 7_000_000 })).not.toBe(base);
    expect(bookingQuoteSignature({ ...quote, pickupBranchId: "b2" })).not.toBe(base);
    expect(bookingRequestBody(quote)).toMatchObject({ acceptedAdvancePaise: 1_699_500, acceptedEstimateTotalPaise: 6_798_000, acceptedRatePerGramPaise: 600_000 });
  });

  it("keeps the request and its key across a refresh until the outcome is known", () => {
    const storage = memory();
    const pending = { key: "k1", at: 1000, signature: bookingQuoteSignature(quote), body: bookingRequestBody(quote) };
    savePendingBooking(storage, scope, pending);
    // A "refresh": a fresh read from storage finds the same key and body.
    expect(loadPendingBooking(storage, scope, 2000)).toEqual(pending);
    expect(loadPendingBooking(storage, { ...scope, productId: "other-product" }, 2000)).toBeNull();
    // Another customer on the same browser never sees it, and nothing is read before identity is known.
    expect(loadPendingBooking(storage, { ...scope, customerId: "cust_2" }, 2000)).toBeNull();
    expect(loadPendingBooking(storage, { ...scope, customerId: "" }, 2000)).toBeNull();
    clearPendingBooking(storage, scope);
    expect(loadPendingBooking(storage, scope, 2000)).toBeNull();
  });

  it("does not replay a day-old or corrupt entry, and survives unavailable storage", () => {
    const storage = memory();
    savePendingBooking(storage, scope, { key: "k", at: 0, signature: "s", body: bookingRequestBody(quote) });
    expect(loadPendingBooking(storage, scope, 25 * 3_600_000)).toBeNull();
    storage.setItem("sg:booking-pending:kairali:cust_1:p", "{not json");
    expect(loadPendingBooking(storage, scope)).toBeNull();
    expect(loadPendingBooking(null, scope)).toBeNull();
    expect(() => savePendingBooking(null, scope, { key: "k", at: 0, signature: "s", body: bookingRequestBody(quote) })).not.toThrow();
  });

  it("treats only a refusal from the server as a known outcome", () => {
    expect(isDefinitiveBookingFailure(409)).toBe(true);
    expect(isDefinitiveBookingFailure(422)).toBe(true);
    expect(isDefinitiveBookingFailure(500)).toBe(false);
    // "Already being processed" is not an outcome: the first request may still finish.
    expect(isDefinitiveBookingFailure(409, "REQUEST_IN_PROGRESS")).toBe(false);
    expect(isDefinitiveBookingFailure(409, "BOOKING_QUOTE_CHANGED")).toBe(true);
    expect(isDefinitiveBookingFailure("FETCH_ERROR")).toBe(false);
    expect(isDefinitiveBookingFailure("TIMEOUT_ERROR")).toBe(false);
    expect(isDefinitiveBookingFailure(undefined)).toBe(false);
  });
});
