import { describe, expect, it } from "vitest";
import { buildPlanCreatePayload, planDetailToForm } from "@/src/features/schemes/plan-builder-form";
import { adaptSettlementPreview } from "@/src/store/api/contract-adapters";
import {
  isPaidAmountGoldCashPreview,
  planShowsCashSettlementBasis,
  resolveCashSettlementBasis,
  validatePlanCashSettlementFields,
} from "@/src/lib/cash-settlement-basis";

describe("cash settlement basis helpers", () => {
  it("defaults legacy redemption rules to GOLD_VALUE", () => {
    expect(resolveCashSettlementBasis({})).toBe("GOLD_VALUE");
    expect(resolveCashSettlementBasis(null)).toBe("GOLD_VALUE");
  });

  it("shows cash basis fields only for gold-weight with CASH mode", () => {
    expect(
      planShowsCashSettlementBasis("GOLD_WEIGHT", ["CASH", "GOLD_HANDOVER"]),
    ).toBe(true);
    expect(planShowsCashSettlementBasis("CASH", ["CASH"])).toBe(false);
    expect(planShowsCashSettlementBasis("GOLD_WEIGHT", ["GOLD_HANDOVER"])).toBe(
      false,
    );
  });

  it("blocks INCLUDE_MONETARY with text-only benefit", () => {
    expect(
      validatePlanCashSettlementFields({
        valueBasis: "GOLD_WEIGHT",
        allowedRedemptionModes: ["CASH"],
        cashSettlementBasis: "PAID_AMOUNT",
        includeMonetaryBenefitInPaidAmountCash: true,
        benefitType: "TEXT_ONLY",
      }),
    ).toMatch(/monetary/);
  });

  it("maps PAID_AMOUNT preview without treating missing rate as paid-amount blocker", () => {
    const preview = adaptSettlementPreview(
      {
        eligible: true,
        type: "MATURITY_REDEMPTION",
        cashSettlementBasis: "PAID_AMOUNT",
        paidAmountBenefitTreatment: "EXCLUDE",
        principalPaise: 400_000,
        goldWeightMg: 800,
        settlementPaise: 400_000,
        blockers: [],
        computation: {
          lines: [
            {
              key: "TOTAL_PAID",
              label: "Total paid",
              amount: { amountPaise: 400_000 },
              sign: "+",
            },
          ],
          finalValue: { amountPaise: 400_000 },
          goldWeight: { weightMg: 800, weightDisplay: "0.800 g" },
        },
        allowedModes: [{ mode: "CASH", label: "Cash", available: true }],
      },
      "MATURITY_REDEMPTION",
    );
    expect(preview.cashSettlementBasis).toBe("PAID_AMOUNT");
    expect(preview.principalPaid).toBe(4000);
    expect(isPaidAmountGoldCashPreview(preview, "CASH")).toBe(true);
    expect(preview.valuationRateDisplay).toBeUndefined();
  });

  it("serializes PAID_AMOUNT + INCLUDE_MONETARY in plan create payload", () => {
    const form = planDetailToForm({
      valueBasis: "GOLD_WEIGHT",
      paymentPattern: "FIXED",
      durationMonths: 11,
      installmentCount: 11,
      goldRules: { weightRoundingMode: "HALF_UP", weightPrecisionMg: 1 },
      redemptionRules: {
        allowedModes: ["CASH"],
        prematureClosureAllowed: false,
        lockInMonths: 0,
        cashSettlementBasis: "PAID_AMOUNT",
        paidAmountBenefitTreatment: "INCLUDE_MONETARY",
      },
      benefit: {
        type: "FIXED_BONUS_AMOUNT",
        bonusBasis: "FLAT",
        bonusValue: 5000,
      },
    });
    form.cashSettlementBasis = "PAID_AMOUNT";
    form.includeMonetaryBenefitInPaidAmountCash = true;
    form.allowedRedemptionModes = ["CASH"];
    const payload = buildPlanCreatePayload(form) as {
      redemptionRules: Record<string, unknown>;
    };
    expect(payload.redemptionRules.cashSettlementBasis).toBe("PAID_AMOUNT");
    expect(payload.redemptionRules.paidAmountBenefitTreatment).toBe(
      "INCLUDE_MONETARY",
    );
  });

  it("omits cash basis fields when CASH redemption is not allowed", () => {
    const form = planDetailToForm({
      valueBasis: "GOLD_WEIGHT",
      paymentPattern: "FIXED",
      durationMonths: 11,
      installmentCount: 11,
      goldRules: { weightRoundingMode: "HALF_UP", weightPrecisionMg: 1 },
      redemptionRules: {
        allowedModes: ["GOLD_HANDOVER"],
        prematureClosureAllowed: false,
        lockInMonths: 0,
        cashSettlementBasis: "PAID_AMOUNT",
      },
    });
    form.allowedRedemptionModes = ["GOLD_HANDOVER"];
    const payload = buildPlanCreatePayload(form) as {
      redemptionRules: Record<string, unknown>;
    };
    expect(payload.redemptionRules.cashSettlementBasis).toBeUndefined();
  });
});
