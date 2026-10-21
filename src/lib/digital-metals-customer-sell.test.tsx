import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CustomerDigitalMetalsSellOrderPage,
  readStashedSellQuote,
} from "@/src/features/customer/customer-digital-metals-sell-pages";

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
        bankPayoutSettled: false,
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
    expect(screen.getByText(/May take 1–2 business days/i)).toBeTruthy();
    expect(screen.getByText(/9012/)).toBeTruthy();
  });

  it("reads stashed sell quote from session storage envelope", () => {
    const key = "customer-dm-sell-quote:dmq_x";
    sessionStorage.setItem(key, JSON.stringify({ quoteId: "dmq_x", settlementPaise: 100 }));
    expect(readStashedSellQuote("dmq_x")?.settlementPaise).toBe(100);
    sessionStorage.removeItem(key);
  });
});
