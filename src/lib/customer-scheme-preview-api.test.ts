import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getShopSchemePurchasePreview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the estimate from the backend's { success, data } response", async () => {
    const { customerApi } = await import("@/src/store/api/customer-api");
    const { default: customerSessionReducer } = await import("@/src/store/slices/customer-session-slice");
    const estimate = { applied: 6000000, appliedPaise: 6000000, makingChargeWaivedPaise: 900000, topUpPaise: 2578600, remaining: 0 };
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, data: estimate }), { status: 200, headers: { "content-type": "application/json" } }),
    ) as typeof fetch;
    const store = configureStore({
      reducer: { customerSession: customerSessionReducer, [customerApi.reducerPath]: customerApi.reducer },
      middleware: (getDefault) => getDefault().concat(customerApi.middleware),
    });
    const result = await store
      .dispatch(customerApi.endpoints.getShopSchemePurchasePreview.initiate({ quoteId: "q1", schemeId: "s1", basis: "CASH_VALUE" }))
      .unwrap();
    expect(result).toEqual(estimate);
  });
});
