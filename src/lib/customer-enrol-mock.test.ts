import { describe, expect, it } from "vitest";
import type { SchemePlan } from "@/src/types/customer";
import {
  buildCustomerEnrolMockResponse,
  resolveCustomerEnrolFirstInstallmentMode,
} from "@/src/lib/customer-enrol-mock";

const basePlan = (overrides: Partial<SchemePlan> = {}): SchemePlan => ({
  id: "plan_test",
  name: "Test plan",
  code: "TST",
  tagline: "",
  model: "FIXED",
  durationMonths: 12,
  amountSummary: "₹1,000",
  benefitSummary: "Bonus",
  rules: [],
  canEnrol: true,
  ...overrides,
});

describe("resolveCustomerEnrolFirstInstallmentMode", () => {
  it("honors locked START_NEXT_CYCLE regardless of payNow", () => {
    const plan = basePlan({
      firstInstallmentModeDefault: "START_NEXT_CYCLE",
      firstInstallmentModeEditable: false,
    });
    expect(resolveCustomerEnrolFirstInstallmentMode(plan, true)).toBe("START_NEXT_CYCLE");
    expect(resolveCustomerEnrolFirstInstallmentMode(plan, undefined)).toBe("START_NEXT_CYCLE");
  });

  it("honors editable payNow choice", () => {
    const plan = basePlan({
      firstInstallmentModeDefault: "COLLECT_NOW",
      firstInstallmentModeEditable: true,
    });
    expect(resolveCustomerEnrolFirstInstallmentMode(plan, false)).toBe("START_NEXT_CYCLE");
    expect(resolveCustomerEnrolFirstInstallmentMode(plan, true)).toBe("COLLECT_NOW");
  });
});

describe("buildCustomerEnrolMockResponse", () => {
  it("returns scheme only for START_NEXT_CYCLE", () => {
    const plan = basePlan({
      model: "FLEXIBLE",
      firstInstallmentModeDefault: "START_NEXT_CYCLE",
      firstInstallmentModeEditable: false,
    });
    const res = buildCustomerEnrolMockResponse(plan, { payNow: true, installmentAmountPaise: 100_000 });
    expect(res.scheme.schemeNumber).toBeTruthy();
    expect(res.paymentType).toBeUndefined();
    expect(res.paymentIntent).toBeUndefined();
    expect(res.paymentLink).toBeUndefined();
  });

  it("returns fixed payment link for COLLECT_NOW fixed plan", () => {
    const plan = basePlan({
      model: "FIXED",
      firstInstallmentModeDefault: "COLLECT_NOW",
      firstInstallmentModeEditable: false,
    });
    const res = buildCustomerEnrolMockResponse(plan, { installmentAmountPaise: 250_000 });
    expect(res.paymentType).toBe("FIXED_PAYMENT_LINK");
    expect(res.paymentLink?.token).toBeTruthy();
    expect(res.paymentIntent).toBeUndefined();
  });

  it("returns flexible intent for COLLECT_NOW flexible plan", () => {
    const plan = basePlan({
      model: "FLEXIBLE",
      firstInstallmentModeDefault: "COLLECT_NOW",
      firstInstallmentModeEditable: true,
    });
    const res = buildCustomerEnrolMockResponse(plan, { payNow: true });
    expect(res.paymentType).toBe("FLEXIBLE_PAYMENT_INTENT");
    expect(res.paymentIntent?.paymentUrl).toContain("phonepe");
    expect(res.paymentLink).toBeUndefined();
  });
});
