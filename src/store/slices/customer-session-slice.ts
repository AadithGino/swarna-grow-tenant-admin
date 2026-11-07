import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { env } from "@/src/config/env";
import {
  clearCustomerTokens,
  TOKEN_KEYS,
  writeCustomerTokenStorage,
} from "@/src/lib/auth-token-storage";

type CustomerSessionState = {
  authenticated: boolean;
  /** Bumped on sign-in/out and confirmed tenant/customer changes; stale RTK responses must ignore. */
  dataEpoch: number;
  /** Monotonic session generation; bumps on every persisted customer token replacement. */
  sessionGeneration: number;
  /** Last sessionGeneration confirmed by /app/profile for the current tokens. */
  profileConfirmedGeneration: number;
  /** True until /app/profile confirms the current session after token replacement. */
  identityRevalidating: boolean;
  customerId?: string;
  /** Backend tenant id confirmed from /app/profile (not JWT). */
  tenantId?: string;
  tenantCode?: string;
  profileComplete?: boolean;
  kycMandatory?: boolean;
  customerSelfRegistration?: boolean;
  customerSelfEnrol?: boolean;
  multiScheme?: boolean;
  customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
  customerAppWriteEnabled?: boolean;
  customerAppPaymentsEnabled?: boolean;
};

const initialState: CustomerSessionState = {
  authenticated: env.useMocks,
  dataEpoch: 0,
  sessionGeneration: 0,
  profileConfirmedGeneration: env.useMocks ? 0 : -1,
  identityRevalidating: false,
  customerId: env.useMocks ? "cus_10482" : undefined,
  tenantCode: env.useMocks ? "KAI" : undefined,
};

function hasStoredCustomerAuth(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem(TOKEN_KEYS.customer.access) ||
      localStorage.getItem(TOKEN_KEYS.customer.refresh),
  );
}

const customerSessionSlice = createSlice({
  name: "customerSession",
  initialState,
  reducers: {
    customerTokensReplaced(state) {
      state.sessionGeneration += 1;
      state.identityRevalidating = true;
    },
    hydrateCustomerSession(state) {
      if (env.useMocks) return;
      if (hasStoredCustomerAuth()) {
        state.authenticated = true;
        state.sessionGeneration += 1;
        state.identityRevalidating = true;
        const access = localStorage.getItem(TOKEN_KEYS.customer.access);
        const refresh = localStorage.getItem(TOKEN_KEYS.customer.refresh);
        if (access) {
          writeCustomerTokenStorage(access, refresh ?? undefined);
        }
      }
    },
    customerProfileCompleted(state) {
      state.profileComplete = true;
    },
    customerIdentityConfirmed(
      state,
      action: PayloadAction<{
        customerId: string;
        tenantId: string;
        tenantCode?: string;
        /** Must match state.sessionGeneration or the action is ignored (stale profile completion). */
        forSessionGeneration?: number;
      }>,
    ) {
      if (
        action.payload.forSessionGeneration !== undefined
        && action.payload.forSessionGeneration !== state.sessionGeneration
      ) {
        return;
      }
      const hadConfirmedIdentity = Boolean(state.tenantId && state.customerId);
      const prev = `${state.tenantId ?? ""}:${state.customerId ?? ""}`;
      const next = `${action.payload.tenantId}:${action.payload.customerId}`;
      state.tenantId = action.payload.tenantId;
      state.customerId = action.payload.customerId;
      if (action.payload.tenantCode) state.tenantCode = action.payload.tenantCode;
      state.profileConfirmedGeneration = state.sessionGeneration;
      state.identityRevalidating = false;
      if (hadConfirmedIdentity && prev !== next) state.dataEpoch += 1;
    },
    customerDataEpochBump(state) {
      state.dataEpoch += 1;
    },
    customerSignedIn(
      state,
      action: PayloadAction<{
        customerId: string;
        tenantCode: string;
        tenantId?: string;
        accessToken?: string;
        refreshToken?: string;
        profileComplete?: boolean;
        kycMandatory?: boolean;
        customerSelfRegistration?: boolean;
        customerSelfEnrol?: boolean;
        multiScheme?: boolean;
        customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
        customerAppWriteEnabled?: boolean;
        customerAppPaymentsEnabled?: boolean;
      }>,
    ) {
      const prevCustomer = state.customerId;
      const prevTenant = state.tenantId;
      const nextCustomer = action.payload.customerId;
      const nextTenant = action.payload.tenantId ?? prevTenant;
      const accountChanged =
        Boolean(prevCustomer && nextCustomer && prevCustomer !== nextCustomer)
        || Boolean(prevTenant && nextTenant && prevTenant !== nextTenant);
      state.authenticated = true;
      state.sessionGeneration += 1;
      state.identityRevalidating = true;
      if (accountChanged) state.dataEpoch += 1;
      state.customerId = action.payload.customerId;
      state.tenantCode = action.payload.tenantCode;
      if (action.payload.tenantId) state.tenantId = action.payload.tenantId;
      state.profileComplete = action.payload.profileComplete;
      state.kycMandatory = action.payload.kycMandatory;
      state.customerSelfRegistration = action.payload.customerSelfRegistration;
      state.customerSelfEnrol = action.payload.customerSelfEnrol;
      state.multiScheme = action.payload.multiScheme;
      state.customerLoginMode = action.payload.customerLoginMode;
      state.customerAppWriteEnabled = action.payload.customerAppWriteEnabled;
      state.customerAppPaymentsEnabled = action.payload.customerAppPaymentsEnabled;
      if (typeof window !== "undefined" && action.payload.accessToken) {
        writeCustomerTokenStorage(
          action.payload.accessToken,
          action.payload.refreshToken,
        );
      }
    },
    customerSignedOut(state) {
      state.authenticated = false;
      state.dataEpoch += 1;
      state.sessionGeneration += 1;
      state.profileConfirmedGeneration = -1;
      state.identityRevalidating = false;
      state.customerId = undefined;
      state.tenantId = undefined;
      state.profileComplete = undefined;
      state.kycMandatory = undefined;
      state.customerSelfRegistration = undefined;
      state.customerSelfEnrol = undefined;
      state.multiScheme = undefined;
      state.customerLoginMode = undefined;
      state.customerAppWriteEnabled = undefined;
      state.customerAppPaymentsEnabled = undefined;
      if (typeof window !== "undefined") {
        clearCustomerTokens();
      }
    },
  },
});

export const {
  customerSignedIn,
  customerSignedOut,
  customerProfileCompleted,
  customerIdentityConfirmed,
  customerDataEpochBump,
  customerTokensReplaced,
  hydrateCustomerSession,
} = customerSessionSlice.actions;
export default customerSessionSlice.reducer;
