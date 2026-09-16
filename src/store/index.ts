import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/ui-slice";
import sessionReducer from "./slices/session-slice";
import { adminApi } from "./api/admin-api";
import { platformApi } from "./api/platform-api";
import { branchListener } from "./branch-listener";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    session: sessionReducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [platformApi.reducerPath]: platformApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(adminApi.middleware)
      .concat(platformApi.middleware)
      .prepend(branchListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
