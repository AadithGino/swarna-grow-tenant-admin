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

function readStoredBranchId(): string {
  if (typeof window === "undefined") return "ALL";
  const stored = localStorage.getItem(ACTING_BRANCH_STORAGE_KEY);
  return stored && stored.trim() ? stored : "ALL";
}

const initialState: UiState = {
  sidebarCollapsed: false,
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
