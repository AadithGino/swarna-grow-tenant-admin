import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { customerApi } from "@/src/store/api/customer-api";
import customerSessionReducer, {
  customerIdentityConfirmed,
  hydrateCustomerSession,
} from "@/src/store/slices/customer-session-slice";
import { readCustomerDataEpoch } from "@/src/lib/customer-identity";

describe("customer identity bootstrap", () => {
  it("first profile confirmation does not bump dataEpoch", () => {
    const store = configureStore({
      reducer: {
        customerSession: customerSessionReducer,
        [customerApi.reducerPath]: customerApi.reducer,
      },
      middleware: (getDefault) => getDefault().concat(customerApi.middleware),
    });
    store.dispatch(hydrateCustomerSession());
    const before = readCustomerDataEpoch(store.getState() as never);
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        tenantCode: "PHASE1A",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    expect(readCustomerDataEpoch(store.getState() as never)).toBe(before);
    expect(store.getState().customerSession.identityRevalidating).toBe(false);
  });

  it("delayed home response is accepted after bootstrap confirmation", async () => {
    const store = configureStore({
      reducer: {
        customerSession: customerSessionReducer,
        [customerApi.reducerPath]: customerApi.reducer,
      },
      middleware: (getDefault) => getDefault().concat(customerApi.middleware),
    });
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        tenantCode: "PHASE1A",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    const epoch = readCustomerDataEpoch(store.getState() as never);
    await store.dispatch(
      customerApi.util.upsertQueryData("getCustomerHome", undefined, {
        activeSchemes: [],
        unreadNotificationCount: 0,
      } as never),
    );
    expect(readCustomerDataEpoch(store.getState() as never)).toBe(epoch);
    expect(customerApi.endpoints.getCustomerHome.select(undefined)(store.getState()).data).toBeDefined();
  });

  it("account change after bootstrap bumps dataEpoch", () => {
    const store = configureStore({
      reducer: {
        customerSession: customerSessionReducer,
        [customerApi.reducerPath]: customerApi.reducer,
      },
    });
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_a",
        customerId: "cus_a",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    const epoch = readCustomerDataEpoch(store.getState() as never);
    store.dispatch(
      customerIdentityConfirmed({
        tenantId: "tenant_b",
        customerId: "cus_b",
        forSessionGeneration: store.getState().customerSession.sessionGeneration,
      }),
    );
    expect(readCustomerDataEpoch(store.getState() as never)).toBe(epoch + 1);
  });
});
