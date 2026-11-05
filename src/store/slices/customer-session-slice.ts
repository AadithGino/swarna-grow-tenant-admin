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
    hydrateCustomerSession(state) {
      if (env.useMocks) return;
      if (hasStoredCustomerAuth()) {
        state.authenticated = true;
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
      }>,
    ) {
      const prev = `${state.tenantId ?? ""}:${state.customerId ?? ""}`;
      const next = `${action.payload.tenantId}:${action.payload.customerId}`;
      state.tenantId = action.payload.tenantId;
      state.customerId = action.payload.customerId;
      if (action.payload.tenantCode) state.tenantCode = action.payload.tenantCode;
      if (prev && prev !== next) state.dataEpoch += 1;
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
      state.authenticated = true;
      state.dataEpoch += 1;
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
  hydrateCustomerSession,
} = customerSessionSlice.actions;
export default customerSessionSlice.reducer;
