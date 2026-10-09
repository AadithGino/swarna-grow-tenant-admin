import { describe, expect, it } from "vitest";
import { adaptCustomerSettlementPreview } from "@/src/lib/customer-payment-adapter";

const validComputation = {
  lines: [
    {
      key: "TOTAL_PAID",
      label: "Total paid",
      amount: { amountPaise: 100_000, amountDisplay: "₹1,000" },
      sign: "+",
    },
  ],
  finalValue: { amountPaise: 110_000, amountDisplay: "₹1,100" },
  goldWeight: null,
};

describe("adaptCustomerSettlementPreview", () => {
  it("normalizes computation lines from API payload", () => {
    const preview = adaptCustomerSettlementPreview({
      eligible: true,
      blockers: [],
      computation: validComputation,
      allowedModes: [{ mode: "CASH", label: "Cash", available: true }],
      settlementPaise: 110_000,
      principalPaise: 100_000,
      benefitPaise: 10_000,
      penaltyPaise: 0,
    });
    expect(preview.previewAvailable).toBe(true);
    expect(preview.eligible).toBe(true);
    expect(preview.computation.lines).toHaveLength(1);
    expect(preview.computation.lines[0].amount.amountPaise).toBe(100_000);
    expect(preview.computation.finalValue.amountPaise).toBe(110_000);
  });

  it("fail-closes empty or malformed payloads", () => {
    const empty = adaptCustomerSettlementPreview({});
    expect(empty.previewAvailable).toBe(false);
    expect(empty.eligible).toBe(false);
    expect(empty.computation.lines).toEqual([]);

    const missingEligible = adaptCustomerSettlementPreview({
      blockers: [],
      computation: validComputation,
      allowedModes: [{ mode: "CASH", label: "Cash", available: true }],
    });
    expect(missingEligible.previewAvailable).toBe(false);
    expect(missingEligible.eligible).toBe(false);
  });

  it("keeps valid ineligible previews with blockers", () => {
    const preview = adaptCustomerSettlementPreview({
      eligible: false,
      blockers: [{ code: "SCHEME_NOT_MATURED", message: "Not matured yet." }],
      computation: validComputation,
      allowedModes: [{ mode: "CASH", label: "Cash", available: true }],
      settlementPaise: 110_000,
      principalPaise: 100_000,
      benefitPaise: 10_000,
      penaltyPaise: 0,
    });
    expect(preview.previewAvailable).toBe(true);
    expect(preview.eligible).toBe(false);
    expect(preview.blockers).toHaveLength(1);
  });

  it("rejects eligible true with zero settlement value", () => {
    const preview = adaptCustomerSettlementPreview({
      eligible: true,
      blockers: [],
      computation: {
        ...validComputation,
        finalValue: { amountPaise: 0, amountDisplay: "₹0" },
      },
      allowedModes: [{ mode: "CASH", label: "Cash", available: true }],
    });
    expect(preview.previewAvailable).toBe(false);
    expect(preview.eligible).toBe(false);
  });
});
