import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsTab } from "@/src/features/customers/customer-digital-metals-tab";
import { DigitalMetalsOperationsPanel } from "@/src/features/digital-metals/digital-metals-operations-panel";

const capabilityEnvelope = {
  enabled: true,
  planEntitled: true,
  canViewHoldings: true,
  canPlaceNewBuy: true,
  pause: { tenantPaused: false, platformPaused: false },
  implementationPhase: 4,
};

const walletEnvelope = {
  items: [
    {
      id: "dmw_1",
      metal: "GOLD",
      finenessPpm: 999000,
      heldUg: "2000000",
      reservedUg: "0",
      availableUg: "2000000",
      pendingBuyUg: "0",
    },
  ],
};

vi.mock("@/src/store/api/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/store/api/admin-api")>();
  return {
    ...actual,
    useGetDigitalMetalsCapabilityQuery: () => ({
      data: capabilityEnvelope,
      isLoading: false,
      isError: false,
    }),
    useSetDigitalMetalsTenantPauseMutation: () => [vi.fn(), { isLoading: false }],
    useGetDigitalMetalsOperationsWorkQueueQuery: () => ({
      data: { summary: { pendingOutbox: 0, failedOutbox: 0, stuckDocuments: 0 }, items: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useRetryDigitalMetalsOutboxEventMutation: () => [vi.fn(), { isLoading: false }],
    useRetryDigitalMetalsDocumentFromOpsMutation: () => [vi.fn(), { isLoading: false }],
    useGetDigitalMetalsCustomerWalletsQuery: () => ({
      data: walletEnvelope,
      isLoading: false,
      isError: false,
    }),
    useGetDigitalMetalsCustomerPassbookQuery: () => ({
      data: { items: [], meta: { nextCursor: null, hasMore: false, limit: 25 } },
      isLoading: false,
      isError: false,
    }),
    useGetDigitalMetalsCustomerRiskHoldsQuery: () => ({
      data: { items: [] },
      isLoading: false,
      isError: false,
    }),
    useResolveDigitalMetalsRiskHoldMutation: () => [vi.fn(), { isLoading: false }],
    useGetDigitalMetalsRedemptionOrdersQuery: () => ({
      data: { items: [] },
      isLoading: false,
      isError: false,
    }),
    useGetDigitalMetalsBuyOrdersQuery: () => ({
      data: { items: [], meta: { hasMore: false, nextCursor: null, limit: 10 } },
      isLoading: false,
      isError: false,
    }),
    useGetDigitalMetalsSellOrdersQuery: () => ({
      data: { items: [], meta: { hasMore: false, nextCursor: null, limit: 10 } },
      isLoading: false,
      isError: false,
    }),
    useGetDigitalMetalsCustomerBankDestinationsQuery: () => ({
      data: { items: [] },
      isLoading: false,
      isError: false,
    }),
    useVerifyDigitalMetalsBankDestinationMutation: () => [vi.fn(), { isLoading: false }],
    useDisableDigitalMetalsBankDestinationMutation: () => [vi.fn(), { isLoading: false }],
  };
});

describe("digital metals UI envelopes", () => {
  it("renders admin customer wallet tab from API envelope", () => {
    render(<CustomerDigitalMetalsTab customerId="cus_test" />);
    expect(screen.getByTestId("admin-customer-digital-metals-tab")).toBeTruthy();
    expect(screen.getByText(/Available 2.0000 g/)).toBeTruthy();
  });

  it("renders tenant pause panel from capability envelope", () => {
    render(<DigitalMetalsOperationsPanel />);
    expect(screen.getByTestId("digital-metals-operations-panel")).toBeTruthy();
    expect(screen.getByText(/Tenant:/)).toBeTruthy();
  });
});
