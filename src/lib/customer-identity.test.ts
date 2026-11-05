import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { customerApi } from "@/src/store/api/customer-api";
import customerSessionReducer from "@/src/store/slices/customer-session-slice";
import {
  customerUrlTenantMatchesSession,
  resetCustomerScopedClientState,
} from "@/src/lib/customer-identity";

describe("customerUrlTenantMatchesSession", () => {
  it("matches identical tenant ids", () => {
    expect(customerUrlTenantMatchesSession("tenant_a", "tenant_a")).toBe(true);
  });

  it("rejects different tenant ids", () => {
    expect(customerUrlTenantMatchesSession("tenant_a", "tenant_b")).toBe(false);
  });

  it("rejects missing ids", () => {
    expect(customerUrlTenantMatchesSession(null, "tenant_a")).toBe(false);
    expect(customerUrlTenantMatchesSession("tenant_a", undefined)).toBe(false);
  });
});

describe("resetCustomerScopedClientState", () => {
  it("clears cached customer API query data after identity change", async () => {
    const store = configureStore({
      reducer: {
        customerSession: customerSessionReducer,
        [customerApi.reducerPath]: customerApi.reducer,
      },
      middleware: (getDefault) => getDefault().concat(customerApi.middleware),
    });
    await store.dispatch(
      customerApi.util.upsertQueryData("getCustomerHome", undefined, {
        walletBalancePaise: 99_00,
      } as never),
    );
    expect(customerApi.endpoints.getCustomerHome.select(undefined)(store.getState()).data).toBeDefined();
    resetCustomerScopedClientState(store.dispatch);
    expect(customerApi.endpoints.getCustomerHome.select(undefined)(store.getState()).data).toBeUndefined();
  });
});
