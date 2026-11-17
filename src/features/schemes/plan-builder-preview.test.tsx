// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildPlanCreatePayload, buildPlanPatchPayload, buildPreviewScheduleBody, defaultPlanBuilderForm, planDetailToForm } from "./plan-builder-form";
import { PlanBuilderCustomerPreview } from "./plan-builder-ui";
import { PlanSchedulePreviewPanel } from "./plan-preview-panel";
import { buildPlanSchedulePreview } from "@/src/mocks/plan-preview-mock";
import type { CollectionFrequency } from "@/src/types/collection";

afterEach(cleanup);
const startDate = "2028-01-31";

describe("scheme builder schedule previews", () => {
  it.each(["MONTHLY", "AT_MATURITY"] as const)("shows one-time funding and %s bonus dates", (timing) => {
    const form = defaultPlanBuilderForm();
    form.oneTimeRules = { timing, basis: "PRINCIPAL_PERCENT", value: 5, amountPeriod: "TERM_TOTAL" };
    form.durationMonths = 2;
    form.lockInMonths = 3;
    form.amountMode = "JEWELLER_FIXED";
    form.firstInstallmentCollectNow = false;
    form.prematureClosureAllowed = false;
    expect(buildPlanCreatePayload(form)).toMatchObject({
      benefit: { eligibility: { minMonthsCompleted: 0 } },
      redemptionRules: { lockInMonths: 0 },
    });
    const body = buildPreviewScheduleBody(form, { startDate });
    expect(body).toMatchObject({
      installmentCount: 1,
      firstInstallmentMode: "COLLECT_NOW",
      redemptionRules: { lockInMonths: 0 },
    });
    const preview = buildPlanSchedulePreview(body);
    expect(preview.schedule).toHaveLength(1);
    expect(preview.summary.oneTimeSchedule?.map((row) => row.dueDate)).toEqual(
      timing === "MONTHLY" ? ["2028-02-29", "2028-03-31"] : ["2028-03-31"],
    );
    render(<PlanBuilderCustomerPreview form={form} steps={[{ id: "amount", label: "Amount" }]} stepIndex={0} isEdit={false} preview={preview} />);
    expect(screen.getByText("One-time payment")).toBeTruthy();
    expect(screen.getByText("Bonus credit dates")).toBeTruthy();
    expect(screen.getByText("2028-01-31")).toBeTruthy();
    expect(screen.queryByText("Installment")).toBeNull();
    expect(screen.queryByText("Due dates")).toBeNull();
  });

  it.each<CollectionFrequency>(["DAILY", "WEEKLY", "MONTHLY"])("balances a total target across %s collections", (collectionFrequency) => {
    const form = defaultPlanBuilderForm();
    form.valueBasis = "GOLD_WEIGHT";
    form.durationMonths = 2;
    form.collectionRules = {
      frequencies: ["DAILY", "WEEKLY", "MONTHLY"], amountBasis: "TOTAL_TARGET", maturityRule: "FIRST_PAYMENT_ANNIVERSARY",
    };
    const preview = buildPlanSchedulePreview(buildPreviewScheduleBody(form, { startDate, collectionFrequency }));
    expect(preview.summary.maturityDate).toBe("2028-03-31");
    expect(preview.schedule.length).toBe({ DAILY: 60, WEEKLY: 9, MONTHLY: 2 }[collectionFrequency]);
    expect(preview.schedule.reduce((total, row) => total + row.amount.amountPaise, 0)).toBe(100000);
    render(<PlanSchedulePreviewPanel data={preview} />);
    expect(screen.getByText("Total payable")).toBeTruthy();
  });

  it("previews a saved flexible plan with its required sample amount", () => {
    const form = defaultPlanBuilderForm();
    form.paymentPattern = "FLEXIBLE_AVERAGE";
    expect(buildPreviewScheduleBody(form, { planId: "plan-1", startDate })).toMatchObject({
      planId: "plan-1", installmentAmountPaise: 50000, firstInstallmentMode: "COLLECT_NOW",
    });
    const preview = buildPlanSchedulePreview(buildPreviewScheduleBody(form, { startDate }));
    expect(preview.summary.maturityDate).toBe("2028-11-30");
    render(<PlanSchedulePreviewPanel data={preview} />);
    expect(screen.getByText("Free window")).toBeTruthy();
    expect(screen.getByText("Capped phase")).toBeTruthy();
  });

  it.each(["CASH", "GOLD_WEIGHT"] as const)("shows valid fixed %s schedule amounts and maturity", (valueBasis) => {
    const form = defaultPlanBuilderForm();
    form.valueBasis = valueBasis;
    form.minAmount = 1200;
    const preview = buildPlanSchedulePreview(buildPreviewScheduleBody(form, { startDate }));
    expect(preview.schedule[0]?.amount.amountPaise).toBe(150000);
    expect(preview.summary.maturityDate).toBe("2028-11-30");
    expect(Boolean(preview.summary.estimatedMaturityValue)).toBe(valueBasis === "CASH");
  });

  it("round-trips structured online purchase rules without adding them to schedule previews", () => {
    const form = defaultPlanBuilderForm();
    form.valueBasis = "GOLD_WEIGHT";
    form.allowedRedemptionModes = ["PURCHASE_ADJUSTMENT"];
    form.schemePurchaseRules = {
      channel: "BOTH",
      settlementBases: ["CASH_VALUE", "GOLD_WEIGHT"],
      makingChargeWaiver: { kind: "PERCENT", basisPoints: 7500 },
      waiverCapPaise: 50000,
    };
    expect(planDetailToForm(buildPlanCreatePayload(form)).schemePurchaseRules).toEqual(form.schemePurchaseRules);
    expect(buildPreviewScheduleBody(form, { startDate })).not.toHaveProperty("schemePurchaseRules");
    expect(buildPlanPatchPayload({ ...form, schemePurchaseRules: undefined })).toMatchObject({ schemePurchaseRules: null });
    expect(buildPlanPatchPayload({ ...form, editLocked: true })).not.toHaveProperty("schemePurchaseRules");
  });

  it("shows an actual request error instead of stale schedule data", () => {
    const preview = buildPlanSchedulePreview(buildPreviewScheduleBody(defaultPlanBuilderForm(), { startDate }));
    render(<PlanSchedulePreviewPanel data={preview} error="Increase the weekly contribution." />);
    expect(screen.getByText("Increase the weekly contribution.")).toBeTruthy();
    expect(screen.queryByText("Total payable")).toBeNull();
  });
});
