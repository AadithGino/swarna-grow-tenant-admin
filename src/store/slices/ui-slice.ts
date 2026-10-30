import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PaymentSuccessPayload } from "@/src/components/common/payment-success-sheet";

interface UiState {
  sidebarCollapsed: boolean;
  branchId: string;
  globalSearch: string;
  paymentSuccess: PaymentSuccessPayload | null;
  paymentSuccessOpen: boolean;
}
const ACTING_BRANCH_STORAGE_KEY = "swarnagrow.actingBranch";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "swarnagrow.sidebarCollapsed";

function readStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readStoredBranchId(): string {
  if (typeof window === "undefined") return "ALL";
  const stored = localStorage.getItem(ACTING_BRANCH_STORAGE_KEY);
  return stored && stored.trim() ? stored : "ALL";
}

const initialState: UiState = {
  sidebarCollapsed: readStoredSidebarCollapsed(),
  branchId: readStoredBranchId(),
  globalSearch: "",
  paymentSuccess: null,
  paymentSuccessOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY,
          state.sidebarCollapsed ? "1" : "0",
        );
      } catch {
        // storage unavailable — keep in-memory state only
      }
    },
    setBranch(state, action: PayloadAction<string>) {
      state.branchId = action.payload;
      if (typeof window === "undefined") return;
      if (action.payload === "ALL") {
        localStorage.removeItem(ACTING_BRANCH_STORAGE_KEY);
      } else {
        localStorage.setItem(ACTING_BRANCH_STORAGE_KEY, action.payload);
      }
    },
    setGlobalSearch(state, action: PayloadAction<string>) {
      state.globalSearch = action.payload;
    },
    showPaymentSuccess(state, action: PayloadAction<PaymentSuccessPayload>) {
      state.paymentSuccess = action.payload;
      state.paymentSuccessOpen = true;
    },
    setPaymentSuccessOpen(state, action: PayloadAction<boolean>) {
      state.paymentSuccessOpen = action.payload;
      if (!action.payload) state.paymentSuccess = null;
    },
    clearPaymentSuccess(state) {
      state.paymentSuccess = null;
      state.paymentSuccessOpen = false;
    },
  },
});

export const {
  toggleSidebar,
  setBranch,
  setGlobalSearch,
  showPaymentSuccess,
  setPaymentSuccessOpen,
  clearPaymentSuccess,
} = uiSlice.actions;
export default uiSlice.reducer;
