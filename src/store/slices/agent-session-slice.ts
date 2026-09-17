import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentSession } from "@/src/types/agent";

export const AGENT_SESSION_KEY = "swarnagrow.agent.session";
export const AGENT_ACCESS_KEY = "swarnagrow.agent.accessToken";
export const AGENT_REFRESH_KEY = "swarnagrow.agent.refreshToken";

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
    },
    setAgentSession(state, action: PayloadAction<AgentSession>) {
      state.session = action.payload;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem(AGENT_SESSION_KEY, JSON.stringify(action.payload));
        localStorage.setItem(AGENT_ACCESS_KEY, action.payload.accessToken);
        localStorage.setItem(AGENT_REFRESH_KEY, action.payload.refreshToken);
      }
    },
    clearAgentSession(state) {
      state.session = null;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem(AGENT_SESSION_KEY);
        localStorage.removeItem(AGENT_ACCESS_KEY);
        localStorage.removeItem(AGENT_REFRESH_KEY);
      }
    },
  },
});

export const { hydrateAgentSession, setAgentSession, clearAgentSession } = agentSessionSlice.actions;
export default agentSessionSlice.reducer;
