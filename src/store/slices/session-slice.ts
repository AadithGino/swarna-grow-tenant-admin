import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { MOCK_OWNER_SESSION } from "@/src/config/mock-session";
import { clearAuthTokens } from "@/src/lib/auth-session";
import type { PortalSession } from "@/src/types/session";
import { SESSION_STORAGE_KEY } from "@/src/types/session";

function readStoredSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalSession;
  } catch {
    return null;
  }
}

type SessionState = {
  session: PortalSession | null;
  hydrated: boolean;
};

const initialState: SessionState = {
  session: null,
  hydrated: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    hydrateSession(state) {
      state.session = readStoredSession();
      state.hydrated = true;
    },
    setSession(state, action: PayloadAction<PortalSession>) {
      state.session = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(action.payload),
        );
        localStorage.setItem(
          "swarnagrow.accessToken",
          action.payload.accessToken,
        );
      }
    },
    clearSession(state) {
      state.session = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        clearAuthTokens();
      }
    },
    markSetupTaskComplete(
      state,
      action: PayloadAction<{ key: string; completed: boolean }>,
    ) {
      const tasks = state.session?.setupTasks;
      if (!tasks) return;
      const task = tasks.find((t) => t.key === action.payload.key);
      if (task) task.completed = action.payload.completed;
      if (state.session && tasks.every((t) => t.completed)) {
        state.session.setupComplete = true;
      }
    },
    useDemoSession(state) {
      state.session = MOCK_OWNER_SESSION;
    },
  },
});

export const {
  hydrateSession,
  setSession,
  clearSession,
  markSetupTaskComplete,
  useDemoSession,
} = sessionSlice.actions;
export default sessionSlice.reducer;
