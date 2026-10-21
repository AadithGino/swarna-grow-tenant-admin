import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsPage } from "@/src/features/customer/customer-digital-metals-page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "demo" }),
}));

vi.mock("@/src/features/customer/customer-digital-metals-document-panel", () => ({
  CustomerDigitalMetalsDocumentPanel: () => <div data-testid="doc-panel" />,
}));

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsCapabilityQuery: () => ({
    data: {
      canViewHoldings: true,
      canPlaceNewBuy: true,
      canPlaceNewSell: true,
      canPlaceRedemption: true,
      blockers: [],
    },
    isLoading: false,
    isError: false,
  }),
  useGetCustomerDigitalMetalsPortfolioQuery: () => ({
    data: {
      items: [
        {
          id: "w1",
          metal: "GOLD",
          finenessPpm: 999000,
          heldUg: "1000000",
          availableUg: "1000000",
          reservedUg: "0",
          valuationStatus: "OK",
          estimatedSaleValue: { amountPaise: 650000, ratePerGramPaise: 650000 },
        },
        {
          id: "w2",
          metal: "SILVER",
          finenessPpm: 999000,
          heldUg: "2000000",
          availableUg: "2000000",
          reservedUg: "0",
          valuationStatus: "STALE_RATE",
        },
      ],
    },
    isLoading: false,
  }),
  useGetCustomerDigitalMetalsPassbookQuery: () => ({
    data: { items: [], meta: { hasMore: false, nextCursor: null, limit: 15 } },
    isLoading: false,
  }),
  useGetCustomerDigitalMetalsStatementQuery: () => ({ data: { activity: [] }, isLoading: false }),
  useGetCustomerDigitalMetalsOpenOrdersSummaryQuery: () => ({
    data: { openBuyCount: 0, openSellCount: 0, openRedemptionCount: 0, totalOpen: 0 },
    isLoading: false,
  }),
}));

describe("customer portfolio UI", () => {
  afterEach(() => cleanup());

  it("renders separate gold and silver wallet cards", () => {
    render(<CustomerDigitalMetalsPage />);
    expect(screen.getByTestId("customer-dm-asset-GOLD-999000")).toBeTruthy();
    expect(screen.getByTestId("customer-dm-asset-SILVER-999000")).toBeTruthy();
    expect(screen.getByTestId("customer-dm-quick-actions")).toBeTruthy();
  });
});
