import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  clearAgentTokens,
  TOKEN_KEYS,
  writeAgentTokenStorage,
  type StoredTokens,
} from "@/src/lib/auth-token-storage";
import type { AgentSession } from "@/src/types/agent";

export const AGENT_SESSION_KEY = TOKEN_KEYS.agent.session;
export const AGENT_ACCESS_KEY = TOKEN_KEYS.agent.access;
export const AGENT_REFRESH_KEY = TOKEN_KEYS.agent.refresh;

function readStored(): AgentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(AGENT_SESSION_KEY);
    return value ? (JSON.parse(value) as AgentSession) : null;
  } catch {
    return null;
  }
}

const initialState: { session: AgentSession | null; hydrated: boolean } = { session: null, hydrated: false };

const agentSessionSlice = createSlice({
  name: "agentSession",
  initialState,
  reducers: {
    hydrateAgentSession(state) {
      state.session = readStored();
      state.hydrated = true;
      if (typeof window !== "undefined" && state.session?.accessToken) {
        writeAgentTokenStorage(
          state.session.accessToken,
          state.session.refreshToken,
        );
      }
    },
    setAgentSession(state, action: PayloadAction<AgentSession>) {
      state.session = action.payload;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem(AGENT_SESSION_KEY, JSON.stringify(action.payload));
        writeAgentTokenStorage(
          action.payload.accessToken,
          action.payload.refreshToken,
        );
      }
    },
    patchAgentTokens(state, action: PayloadAction<StoredTokens>) {
      if (!state.session) return;
      state.session.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.session.refreshToken = action.payload.refreshToken;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(AGENT_SESSION_KEY, JSON.stringify(state.session));
      }
    },
    clearAgentSession(state) {
      state.session = null;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem(AGENT_SESSION_KEY);
        clearAgentTokens();
      }
    },
  },
});

export const {
  hydrateAgentSession,
  setAgentSession,
  patchAgentTokens,
  clearAgentSession,
} = agentSessionSlice.actions;
export default agentSessionSlice.reducer;
