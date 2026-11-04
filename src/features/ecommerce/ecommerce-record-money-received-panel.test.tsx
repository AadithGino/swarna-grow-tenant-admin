/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EcommerceRecordMoneyReceivedPanel } from "@/src/features/ecommerce/ecommerce-record-money-received-panel";

describe("EcommerceRecordMoneyReceivedPanel", () => {
  afterEach(() => cleanup());

  it("submits bank deposit in rupees for selected orders", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      reconciliation: { outcomeLabel: "Matched" },
    });
    const onSuccess = vi.fn();

    render(
      <EcommerceRecordMoneyReceivedPanel
        selectedOrders={[
          { orderId: "o1", orderNumber: "SG-1001", expectedCodPaise: 50_000 },
          { orderId: "o2", orderNumber: "SG-1002", expectedCodPaise: 75_000 },
        ]}
        canOperate
        isSubmitting={false}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onError={() => {}}
      />,
    );

    await user.type(screen.getByLabelText(/bank reference/i), "NEFT999888777");
    await user.type(screen.getByLabelText(/bank amount received/i), "1234.50");
    const feeInput = screen.getByLabelText(/total courier fees/i);
    await user.clear(feeInput);
    await user.type(feeInput, "12.00");
    await user.click(screen.getByRole("button", { name: /record money received/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        orderIds: ["o1", "o2"],
        bankCreditReference: "NEFT999888777",
        bankCreditRupees: "1234.50",
        totalCourierFeeRupees: expect.stringMatching(/^12\.00$/),
        bankCreditedAt: expect.any(String),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows short payment hint when bank amount is below expected net", async () => {
    const user = userEvent.setup();
    render(
      <EcommerceRecordMoneyReceivedPanel
        selectedOrders={[{ orderId: "o1", orderNumber: "SG-1", expectedCodPaise: 10_000 }]}
        canOperate
        isSubmitting={false}
        onSubmit={vi.fn()}
        onSuccess={() => {}}
        onError={() => {}}
      />,
    );
    await user.type(screen.getByLabelText(/bank amount received/i), "50");
    expect(screen.getAllByText(/short/i).length).toBeGreaterThan(0);
  });
});
