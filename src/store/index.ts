import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/ui-slice";
import sessionReducer from "./slices/session-slice";
import { adminApi } from "./api/admin-api";
import { platformApi } from "./api/platform-api";
import { customerApi } from "./api/customer-api";
import customerSessionReducer from "./slices/customer-session-slice";
import agentSessionReducer from "./slices/agent-session-slice";
import { agentApi } from "./api/agent-api";
import { branchListener } from "./branch-listener";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    session: sessionReducer,
    customerSession: customerSessionReducer,
    agentSession: agentSessionReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [platformApi.reducerPath]: platformApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [agentApi.reducerPath]: agentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(adminApi.middleware)
      .concat(platformApi.middleware)
      .concat(customerApi.middleware)
      .concat(agentApi.middleware)
      .prepend(branchListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
