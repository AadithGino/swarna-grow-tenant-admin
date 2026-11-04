import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  CustomerDigitalMetalsSellOrderPage,
  readStashedSellQuote,
} from "@/src/features/customer/customer-digital-metals-sell-pages";

afterEach(cleanup);

const payment = vi.hoisted(() => ({ method: "BANK", bankPaid: false, cashPaid: false }));
beforeEach(() => { payment.method = "BANK"; payment.bankPaid = false; payment.cashPaid = false; });

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "demo" }),
}));

vi.mock("@/src/features/customer/customer-digital-metals-document-panel", () => ({
  CustomerDigitalMetalsDocumentPanel: () => null,
}));

vi.mock("@/src/store/api/customer-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/store/api/customer-api")>();
  return {
    ...actual,
    useGetCustomerDigitalMetalsSellOrderQuery: () => ({
      data: {
        id: "dmso_test",
        status: "PAYABLE_OPEN",
        payoutMethod: payment.method,
        quantityUg: "1000000",
        settlementPaise: 580_000,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useGetCustomerDigitalMetalsSellOrderPayoutStatusQuery: () => ({
      data: {
        saleExecuted: true,
        bankPayoutSettled: payment.bankPaid,
        cashPaid: payment.cashPaid,
        payoutMethod: payment.method,
        payoutDestinationMasked: {
          accountLast4: "9012",
          ifsc: "HDFC0001234",
          accountHolderName: "Test User",
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useCancelCustomerDigitalMetalsSellOrderMutation: () => [vi.fn(), { isLoading: false }],
  };
});

describe("customer digital metals sell UI", () => {
  it("distinguishes metal sale executed from bank payout settled", () => {
    render(<CustomerDigitalMetalsSellOrderPage orderId="dmso_test" />);
    expect(screen.getByTestId("customer-dm-payout-tracking")).toBeTruthy();
    expect(screen.getByText(/Metal debited from your wallet/i)).toBeTruthy();
    expect(screen.getByText(/Waiting for your jeweller to transfer and record payment/i)).toBeTruthy();
    expect(screen.queryByText(/Bank transfer initiated/i)).toBeNull();
    expect(screen.queryByText(/Waiting for jeweller approval/i)).toBeNull();
    expect(screen.getByText(/9012/)).toBeTruthy();
  });

  it("shows a settled bank payment as paid rather than payment pending", () => {
    payment.bankPaid = true;
    render(<CustomerDigitalMetalsSellOrderPage orderId="dmso_test" />);
    expect(screen.getByText(/Bank payment recorded by your jeweller/i)).toBeTruthy();
    expect(screen.queryByText(/Waiting for your jeweller to transfer/i)).toBeNull();
  });

  it("tracks settled cash without showing a pending bank transfer", () => {
    payment.method = "CASH";
    payment.cashPaid = true;
    render(<CustomerDigitalMetalsSellOrderPage orderId="dmso_test" />);
    expect(screen.getByText(/Cash payment recorded by your jeweller/i)).toBeTruthy();
    expect(screen.queryByText("Bank payout")).toBeNull();
    expect(screen.queryByText(/Waiting for your jeweller/i)).toBeNull();
  });

  it("reads stashed sell quote from session storage envelope", () => {
    const key = "customer-dm-sell-quote:dmq_x";
    sessionStorage.setItem(key, JSON.stringify({ quoteId: "dmq_x", settlementPaise: 100 }));
    expect(readStashedSellQuote("dmq_x")?.settlementPaise).toBe(100);
    sessionStorage.removeItem(key);
  });
});
