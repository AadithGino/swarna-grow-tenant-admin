import type { Enrollment } from "@/src/types/domain";
import { EnrollmentMaturityTab } from "@/src/features/enrollments/enrollment-maturity-tab";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaturityGoldCredit } from "@/src/components/common/maturity-gold-credit";
import { validatePlanBenefit } from "@/src/lib/plan-builder-validation";
import { buildPlanCreatePayload, defaultPlanBuilderForm, planDetailToForm } from "./plan-builder-form";

const goldBonus = {
  bonusBasis: "NET_GOLD_WEIGHT" as const,
  bonusPercent: 7,
  requireAllCollections: true,
};

describe("maturity gold benefit", () => {
  it("serializes a standard monthly plan with a computed benefit and no selectable schedule", () => {
    const form = { ...defaultPlanBuilderForm(), valueBasis: "GOLD_WEIGHT" as const, benefitType: "MATURITY_GOLD_CREDIT" as const, goldBonus };
    const payload = buildPlanCreatePayload(form);
    expect(payload).not.toHaveProperty("collectionRules");
    expect(payload.benefit).toMatchObject({ type: "MATURITY_GOLD_CREDIT", goldBonus, textBenefit: null });
    expect(validatePlanBenefit(form)).toEqual({});
    expect(validatePlanBenefit({ ...form, goldBonus: { ...goldBonus, bonusPercent: 7.5 } })).toHaveProperty("goldBonus");
  });

  it("loads saved Aira terms into Benefit and separates the rules in a new save", () => {
    const schedule = { frequencies: ["DAILY", "WEEKLY", "MONTHLY"], amountBasis: "PER_COLLECTION", maturityRule: "ENROLMENT_ANNIVERSARY" };
    const form = planDetailToForm({ valueBasis: "GOLD_WEIGHT", collectionRules: { ...schedule, ...goldBonus } });
    const payload = buildPlanCreatePayload(form);
    expect(payload.collectionRules).toEqual(schedule);
    expect(payload.benefit).toMatchObject({ type: "MATURITY_GOLD_CREDIT", goldBonus });
  });

  it("shows estimated weight before maturity and credited weight once posted", () => {
    const view = render(<MaturityGoldCredit bonus={{ status: "PENDING", weightMg: 0, estimatedWeightMg: 700 }} />);
    expect(screen.getByText(/Estimated on contributions to date.*0.7 g/)).toBeVisible();
    view.rerender(<MaturityGoldCredit bonus={{ status: "CREDITED", weightMg: 700 }} />);
    expect(screen.getByText("0.7 g credited")).toBeVisible();
  });
});


afterEach(cleanup);

it("only offers redemption when the gold settlement can proceed", () => {
  const common = { paid: 10000, valueBasis: "GOLD_WEIGHT", progress: 1, tenure: 1, installment: 10000 };
  const props = { onMaturityPreview: vi.fn(), onPrematurePreview: vi.fn(), onRedeem: vi.fn(), onCloseEarly: vi.fn() };
  const view = render(<EnrollmentMaturityTab {...props} enrollment={{
    ...common, status: "ACTIVE", canRedeem: false, collectionBonus: { status: "PENDING_RATE", weightMg: 0 },
  } as Enrollment} />);
  expect(screen.queryByRole("button", { name: "Early closure" })).toBeNull();
  expect(screen.getByText(/Redemption opens after the maturity gold rate/)).toBeVisible();
  view.rerender(<EnrollmentMaturityTab {...props} enrollment={{
    ...common, paid: 0, status: "MATURED", canRedeem: false, collectionBonus: { status: "INELIGIBLE", weightMg: 0 },
  } as Enrollment} />);
  expect(screen.queryByRole("button", { name: "Initiate redemption" })).toBeNull();
  expect(screen.getByText("No gold remains to redeem.")).toBeVisible();
  view.rerender(<EnrollmentMaturityTab {...props} enrollment={{
    ...common, status: "MATURED", canRedeem: true, collectionBonus: { status: "CREDITED", weightMg: 700 },
  } as Enrollment} />);
  expect(screen.getByRole("button", { name: "Initiate redemption" })).toBeVisible();
});
