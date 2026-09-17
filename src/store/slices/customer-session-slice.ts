import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { env } from "@/src/config/env";

type CustomerSessionState = {
  authenticated: boolean;
  customerId?: string;
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
  customerId: env.useMocks ? "cus_10482" : undefined,
  tenantCode: env.useMocks ? "KAI" : undefined,
};

const customerSessionSlice = createSlice({
  name: "customerSession",
  initialState,
  reducers: {
    customerProfileCompleted(state) {
      state.profileComplete = true;
    },
    customerSignedIn(
      state,
      action: PayloadAction<{
        customerId: string;
        tenantCode: string;
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
      state.customerId = action.payload.customerId;
      state.tenantCode = action.payload.tenantCode;
      state.profileComplete = action.payload.profileComplete;
      state.kycMandatory = action.payload.kycMandatory;
      state.customerSelfRegistration = action.payload.customerSelfRegistration;
      state.customerSelfEnrol = action.payload.customerSelfEnrol;
      state.multiScheme = action.payload.multiScheme;
      state.customerLoginMode = action.payload.customerLoginMode;
      state.customerAppWriteEnabled = action.payload.customerAppWriteEnabled;
      state.customerAppPaymentsEnabled = action.payload.customerAppPaymentsEnabled;
      if (typeof window !== "undefined") {
        if (action.payload.accessToken) localStorage.setItem("swarnagrow.customer.accessToken", action.payload.accessToken);
        if (action.payload.refreshToken) localStorage.setItem("swarnagrow.customer.refreshToken", action.payload.refreshToken);
      }
    },
    customerSignedOut(state) {
      state.authenticated = false;
      state.customerId = undefined;
      state.profileComplete = undefined;
      state.kycMandatory = undefined;
      state.customerSelfRegistration = undefined;
      state.customerSelfEnrol = undefined;
      state.multiScheme = undefined;
      state.customerLoginMode = undefined;
      state.customerAppWriteEnabled = undefined;
      state.customerAppPaymentsEnabled = undefined;
      if (typeof window !== "undefined") {
        localStorage.removeItem("swarnagrow.customer.accessToken");
        localStorage.removeItem("swarnagrow.customer.refreshToken");
      }
    },
  },
});

export const { customerSignedIn, customerSignedOut, customerProfileCompleted } = customerSessionSlice.actions;
export default customerSessionSlice.reducer;
