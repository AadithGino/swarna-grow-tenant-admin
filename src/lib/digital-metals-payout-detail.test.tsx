import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DigitalMetalsPayoutDetailPage } from "@/src/features/digital-metals/digital-metals-payout-detail-page";

vi.mock("@/src/features/digital-metals/digital-metals-admin-shared", () => ({
  useDigitalMetalsServerEntitlement: () => ({
    loading: false,
    workspaceVisible: true,
    disabledMessage: null,
  }),
}));

vi.mock("@/src/store/api/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/store/api/admin-api")>();
  return {
    ...actual,
    useGetDigitalMetalsPayoutQuery: () => ({
      data: {
        payout: {
          id: "dmpos_mock",
          status: "APPROVED",
          amountPaise: 600000,
          permittedActions: ["SUBMIT"],
          destinationSnapshot: { accountHolderName: "Mock", accountLast4: "9012", ifsc: "HDFC0001234" },
          statusHistory: [{ status: "PENDING_APPROVAL", at: new Date().toISOString(), note: "Created" }],
        },
        payable: { outstandingPaise: 600000 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useApproveDigitalMetalsPayoutMutation: () => [vi.fn(), {}],
    useSubmitDigitalMetalsPayoutMutation: () => [vi.fn(), {}],
    useRecordDigitalMetalsPayoutSettlementMutation: () => [vi.fn(), {}],
    useRecordDigitalMetalsPayoutFailureMutation: () => [vi.fn(), {}],
    useMarkDigitalMetalsPayoutUnknownMutation: () => [vi.fn(), {}],
    useResolveDigitalMetalsPayoutUnknownMutation: () => [vi.fn(), {}],
  };
});

describe("digital metals payout detail envelope", () => {
  it("renders permitted actions and masked destination from API", () => {
    render(<DigitalMetalsPayoutDetailPage payoutId="dmpos_mock" />);
    expect(screen.getByTestId("digital-metals-payout-detail")).toBeTruthy();
    expect(screen.getByText(/Record bank submission/)).toBeTruthy();
    expect(screen.getByText(/9012/)).toBeTruthy();
  });
});
