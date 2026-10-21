import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsBuyPage } from "@/src/features/customer/customer-digital-metals-buy-pages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsCapabilityQuery: () => ({
    data: {
      canPlaceNewBuy: true,
      assets: [{ metal: "SILVER", finenessPpm: 999000, quoteReady: true }],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateDigitalMetalsBuyQuoteMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("customer buy silver-only", () => {
  afterEach(() => cleanup());

  it("shows silver as initial asset after load", () => {
    render(<CustomerDigitalMetalsBuyPage />);
    expect(screen.getByTestId("customer-dm-buy-asset")).toBeTruthy();
    expect(screen.getAllByText(/Silver/i).length).toBeGreaterThan(0);
  });
});
