/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaymentsNeedingAttentionPage } from "./payments-needing-attention-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/payments/needing-attention",
}));

vi.mock("@/src/store/hooks", () => ({
  useAppSelector: () => ({
    session: {
      user: { permissions: ["ecommerce.read", "digital-metals.read"] },
    },
  }),
}));

vi.mock("@/src/store/api/admin-api", () => ({
  useGetPaymentsNeedingAttentionQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      computedAt: new Date().toISOString(),
      domainsIncluded: { ecommerce: true, digitalMetals: true },
      items: [
        {
          id: "ecom:TEST:1",
          domain: "ECOMMERCE",
          kind: "STUCK_RECONCILE",
          reasonLabel: "Stuck reconcile",
          nextActionLabel: "Retry gateway reconcile on the order",
          amountPaise: 50000,
          status: "OPEN",
          customer: { name: "Test User", mobile: "9999999999" },
          transactionHref: "/ecommerce/orders/ord_1",
          transactionLabel: "Order 1001",
          refundObligation: null,
        },
      ],
    },
    refetch: vi.fn(),
  }),
}));

describe("PaymentsNeedingAttentionPage", () => {
  afterEach(() => cleanup());

  it("renders unified queue rows with next action and transaction link", () => {
    render(<PaymentsNeedingAttentionPage />);
    expect(screen.getByTestId("payments-needing-attention")).toBeTruthy();
    expect(screen.getAllByText("Stuck reconcile").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Retry gateway reconcile on the order").length).toBeGreaterThan(0);
    const txLinks = screen.getAllByRole("link", { name: /Order 1001/i });
    expect(txLinks.some((el) => el.getAttribute("href") === "/ecommerce/orders/ord_1")).toBe(true);
  });
});
