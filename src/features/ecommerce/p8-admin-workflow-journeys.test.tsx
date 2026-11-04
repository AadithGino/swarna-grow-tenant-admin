/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EcommerceOrderCancellationJourney } from "@/src/features/ecommerce/ecommerce-order-cancellation-journey";
import { EcommerceOrderReturnJourney } from "@/src/features/ecommerce/ecommerce-order-return-journey";
import type { EcommerceOrderDetail } from "@/src/types/ecommerce-order";

const noopMutation = () => ({ unwrap: () => Promise.resolve({}) });

const baseOrder: EcommerceOrderDetail = {
  id: "eo_p8",
  status: "PROCESSING",
  fulfilmentMode: "DELIVERY",
  version: 1,
  totalPaise: 25_000,
  paymentMethod: "ONLINE",
};

describe("P8 admin workflow journeys (browser smoke)", () => {
  afterEach(() => cleanup());

  it("cancellation journey shows review and confirm steps", () => {
    render(
      <EcommerceOrderCancellationJourney
        order={baseOrder}
        cancellationView={{ capabilities: { adminCancelAllowed: true, cancellationRequestAllowed: true } }}
        canOperate
        onRefresh={() => {}}
        decideCancellation={noopMutation}
        decideLoading={false}
        initiateCancellation={noopMutation}
        initiateLoading={false}
        recordCodRefund={noopMutation}
        recordCodLoading={false}
      />,
    );
    expect(screen.getByTestId("ecommerce-cancellation-journey")).toBeTruthy();
    expect(screen.getByText(/Step 1 — Review/i)).toBeTruthy();
    expect(screen.getByText(/Step 2 — Confirm/i)).toBeTruthy();
  });

  it("return journey renders five-step progress rail", () => {
    render(
      <EcommerceOrderReturnJourney
        order={baseOrder}
        orderReturn={{ id: "ret1", status: "PENDING_REVIEW", kind: "RETURN" }}
        canFulfilmentOperate
        canRefundOperate
        onRefresh={() => {}}
        decideReturn={noopMutation}
        recordReturnReceived={noopMutation}
        recordReturnInspection={noopMutation}
        createReturnRefundCase={noopMutation}
        createReturnRefundCaseLoading={false}
        resolveReturn={noopMutation}
        returnDecisionReason=""
        setReturnDecisionReason={() => {}}
        inspectionNote=""
        setInspectionNote={() => {}}
        resolutionNote=""
        setResolutionNote={() => {}}
        replacementOrderId=""
        setReplacementOrderId={() => {}}
        codRefundFields={null}
      />,
    );
    expect(screen.getByTestId("ecommerce-return-journey")).toBeTruthy();
    expect(screen.getByText(/Approve or reject/i)).toBeTruthy();
    expect(screen.getByText(/Close request/i)).toBeTruthy();
  });
});
