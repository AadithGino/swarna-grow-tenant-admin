// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OneTimeGoldProgressPanel } from "@/src/components/common/one-time-gold-progress";
import { adaptCustomerCollectionPreview } from "@/src/lib/customer-plan-adapter";

afterEach(cleanup);

it("keeps all twelve bonus dates separate from the one upfront payment", () => {
  const periods = Array.from({ length: 12 }, (_, index) => ({
    period: index + 1,
    dueDate: `2028-${String(index + 1).padStart(2, "0")}-15`,
    status: index === 0 ? "CREDITED" : "PENDING",
    weightMg: index === 0 ? 200 : 0,
  }));
  const { preview } = adaptCustomerCollectionPreview({
    preview: {
      installmentCount: 1,
      installmentAmount: { amountPaise: 10_000_000 },
      totalPayable: { amountPaise: 10_000_000 },
      oneTimeSchedule: periods,
      maturityDate: periods[11].dueDate,
    },
  });
  expect(preview?.installmentCount).toBe(1);
  expect(preview?.oneTimeSchedule).toHaveLength(12);
  render(<OneTimeGoldProgressPanel progress={{
    rules: { timing: "MONTHLY", basis: "PRINCIPAL_PERCENT", value: 2, amountPeriod: "PER_PERIOD" },
    fundedOn: "2027-12-15",
    principalWeightMg: 10_000,
    originalPaidPaise: 10_000_000,
    creditedWeightMg: 200,
    redeemableBonusWeightMg: 0,
    nextCreditDate: periods[1].dueDate,
    periods,
  }} />);
  expect(screen.getByText(/1 of 12 credits posted/)).toBeTruthy();
  expect(screen.getByText("0.200 g credited")).toBeTruthy();
  expect(screen.getAllByText("Scheduled")).toHaveLength(11);
  expect(screen.queryByRole("button")).toBeNull();
});
