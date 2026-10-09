import { describe, expect, it } from "vitest";
import { adaptCustomerSettlementPreview } from "@/src/lib/customer-payment-adapter";

describe("adaptCustomerSettlementPreview", () => {
  it("normalizes computation lines from API payload", () => {
    const preview = adaptCustomerSettlementPreview({
      eligible: true,
      blockers: [],
      computation: {
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
      },
      settlementPaise: 110_000,
      principalPaise: 100_000,
      benefitPaise: 10_000,
      penaltyPaise: 0,
    });
    expect(preview.eligible).toBe(true);
    expect(preview.computation.lines).toHaveLength(1);
    expect(preview.computation.lines[0].amount.amountPaise).toBe(100_000);
    expect(preview.computation.finalValue.amountPaise).toBe(110_000);
  });

  it("returns empty lines instead of throwing on empty mock payloads", () => {
    const preview = adaptCustomerSettlementPreview({});
    expect(preview.computation.lines).toEqual([]);
    expect(preview.eligible).toBe(true);
  });
});
