import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { customerApi } from "@/src/store/api/customer-api";
import customerSessionReducer, {
  customerIdentityConfirmed,
  customerTokensReplaced,
} from "@/src/store/slices/customer-session-slice";
import { markCustomerIdentityRevalidation } from "@/src/lib/customer-identity";

function makeStore() {
  return configureStore({
    reducer: {
      customerSession: customerSessionReducer,
      [customerApi.reducerPath]: customerApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(customerApi.middleware),
  });
}

describe("customer session generation confirmation", () => {
  it("token replacement blocks ready until profile confirms current generation", () => {
    const store = makeStore();
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        tenantCode: "PHASE1A",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    expect(store.getState().customerSession.profileConfirmedGeneration).toBe(
      store.getState().customerSession.sessionGeneration,
    );
    store.dispatch(customerTokensReplaced());
    expect(store.getState().customerSession.identityRevalidating).toBe(true);
    expect(
      store.getState().customerSession.profileConfirmedGeneration,
    ).toBeLessThan(store.getState().customerSession.sessionGeneration);
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        tenantCode: "PHASE1A",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    expect(store.getState().customerSession.profileConfirmedGeneration).toBe(
      store.getState().customerSession.sessionGeneration,
    );
    expect(store.getState().customerSession.identityRevalidating).toBe(false);
  });

  it("identical profile payload still clears revalidation after token refresh generation bump", () => {
    const store = makeStore();
    store.dispatch(customerTokensReplaced());
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    expect(store.getState().customerSession.identityRevalidating).toBe(false);
  });

  it("markCustomerIdentityRevalidation invalidates profile without clearing generation", () => {
    const store = makeStore();
    store.dispatch(customerTokensReplaced());
    const gen = store.getState().customerSession.sessionGeneration;
    markCustomerIdentityRevalidation(store.dispatch);
    expect(store.getState().customerSession.sessionGeneration).toBe(gen);
  });

  it("ignores customerIdentityConfirmed with wrong forSessionGeneration", () => {
    const store = makeStore();
    store.dispatch(customerTokensReplaced());
    const gen = store.getState().customerSession.sessionGeneration;
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        forSessionGeneration: gen - 1,
      }),
    );
    expect(store.getState().customerSession.profileConfirmedGeneration).toBeLessThan(gen);
    expect(store.getState().customerSession.identityRevalidating).toBe(true);
  });
});
