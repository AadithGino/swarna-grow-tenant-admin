import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

function profileEnvelope(tenantId: string, customerId: string) {
  return {
    success: true,
    data: {
      id: customerId,
      tenantId,
      customerNumber: "N",
      name: "T",
      mobile: "+9100",
      mobileImmutable: true,
      profileComplete: true,
      version: 1,
      tenant: {
        id: tenantId,
        tenantCode: "TC",
        displayName: "Store",
      },
    },
  };
}

describe("getCustomerProfile respects session generation at request start", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("discards fulfillment when sessionGeneration changes before the fetch completes", async () => {
    const { customerApi } = await import("@/src/store/api/customer-api");
    const { default: customerSessionReducer, customerTokensReplaced } = await import(
      "@/src/store/slices/customer-session-slice"
    );

    let resolveFetch!: (v: Response) => void;
    const fetchDone = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = vi.fn(() => fetchDone) as typeof fetch;

    const store = configureStore({
      reducer: {
        customerSession: customerSessionReducer,
        [customerApi.reducerPath]: customerApi.reducer,
      },
      middleware: (getDefault) => getDefault().concat(customerApi.middleware),
    });

    const pending = store.dispatch(customerApi.endpoints.getCustomerProfile.initiate()).unwrap();

    store.dispatch(customerTokensReplaced());

    resolveFetch!(
      new Response(JSON.stringify(profileEnvelope("tenant_a", "cus_a")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(pending).rejects.toMatchObject({
      status: "CUSTOM_ERROR",
      data: { code: "CUSTOMER_SESSION_STALE" },
    });
    expect(store.getState().customerSession.profileConfirmedGeneration).toBe(-1);
    expect(store.getState().customerSession.identityRevalidating).toBe(true);
  });
});
