import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsRedeemCatalogPage } from "@/src/features/customer/customer-digital-metals-redeem-pages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "demo" }),
}));

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsCapabilityQuery: () => ({
    data: { canPlaceRedemption: true },
    isLoading: false,
    isError: false,
  }),
  useGetCustomerDigitalMetalsPortfolioQuery: () => ({
    data: { items: [{ branchId: "br_mock" }] },
    isLoading: false,
  }),
  useGetCustomerDigitalMetalsRedemptionCatalogueQuery: () => ({
    data: {
      items: [
        {
          id: "dmrci_mock",
          label: "2g Gold Coin",
          metal: "GOLD",
          finenessPpm: 999000,
          chargeTotalPaise: 50000,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateCustomerDigitalMetalsRedemptionQuoteMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("customer redemption catalogue envelope", () => {
  it("renders catalogue items from API", () => {
    render(<CustomerDigitalMetalsRedeemCatalogPage />);
    expect(screen.getByTestId("customer-dm-redeem-catalogue")).toBeTruthy();
    expect(screen.getByText(/2g Gold Coin/)).toBeTruthy();
  });
});
