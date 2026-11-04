/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EcommercePickupCollectionPanel } from "@/src/features/ecommerce/ecommerce-pickup-collection-panel";
import type { EcommerceOrderDetail } from "@/src/types/ecommerce-order";

function baseOrder(overrides: Partial<EcommerceOrderDetail> = {}): EcommerceOrderDetail {
  return {
    id: "eo_test",
    status: "READY_FOR_PICKUP",
    fulfilmentMode: "BRANCH_PICKUP",
    version: 3,
    totalPaise: 1000,
    fulfilmentHandover: {
      pickupCodeActive: true,
      pickupCodeExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      pickupCodeFailedAttempts: 0,
    },
    ...overrides,
  };
}

describe("EcommercePickupCollectionPanel", () => {
  afterEach(() => cleanup());

  it("submits customer pickup code and attestation", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockResolvedValue({ status: "DELIVERED" });
    render(
      <EcommercePickupCollectionPanel
        order={baseOrder()}
        canOperate
        confirmCollection={confirm}
        isConfirming={false}
        onSuccess={() => {}}
        onError={() => {}}
      />,
    );

    await user.type(screen.getByLabelText(/customer pickup code/i), "482910");
    await user.type(screen.getByLabelText(/collected by/i), "Anu Joseph");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /confirm collection/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "eo_test",
        expectedVersion: 3,
        pickupCode: "482910",
        recipientName: "Anu Joseph",
        staffHandoverConfirmed: true,
      }),
    );
  });

  it("shows expiry and attempt guidance", () => {
    render(
      <EcommercePickupCollectionPanel
        order={baseOrder({
          fulfilmentHandover: {
            pickupCodeActive: true,
            pickupCodeExpiresAt: "2026-12-01T10:00:00.000Z",
            pickupCodeFailedAttempts: 4,
          },
        })}
        canOperate
        confirmCollection={vi.fn()}
        isConfirming={false}
        onSuccess={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.getByText(/1 attempt left/i)).toBeTruthy();
  });
  it("reissues expired/locked codes through the existing action and refreshes the order", async () => {
    const user = userEvent.setup();
    const reissue = vi.fn().mockResolvedValue({});
    const refresh = vi.fn();
    render(<EcommercePickupCollectionPanel order={baseOrder({ fulfilmentHandover: { pickupCodeActive: false, pickupCodeExpiresAt: "2026-01-01T00:00:00Z", pickupCodeFailedAttempts: 5 } })}
      canOperate confirmCollection={vi.fn()} isConfirming={false} reissueCode={reissue} onSuccess={refresh} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: /confirm collection/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /reissue pickup code/i }));
    expect(reissue).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText(/mark ready.*again/i)).toBeNull();
  });

});
