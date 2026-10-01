import { describe, expect, it } from "vitest";
import { adaptEnrollment } from "@/src/store/api/contract-adapters";

describe("enrollment cash settlement basis from snapshot", () => {
  it("prefers planSnapshot over current plan when they conflict", () => {
    const row = adaptEnrollment({
      _id: "sch_1",
      enrollmentNumber: "ENR-1",
      customerId: "cus_1",
      valueBasis: "GOLD_WEIGHT",
      status: "ACTIVE",
      planSnapshot: {
        valueBasis: "GOLD_WEIGHT",
        redemptionRules: {
          allowedModes: ["CASH"],
          cashSettlementBasis: "PAID_AMOUNT",
          paidAmountBenefitTreatment: "EXCLUDE",
        },
      },
      plan: {
        redemptionRules: {
          allowedModes: ["CASH"],
          cashSettlementBasis: "GOLD_VALUE",
          paidAmountBenefitTreatment: "INCLUDE_MONETARY",
        },
      },
    });
    expect(row.cashSettlementBasis).toBe("PAID_AMOUNT");
    expect(row.paidAmountBenefitTreatment).toBe("EXCLUDE");
  });
});
