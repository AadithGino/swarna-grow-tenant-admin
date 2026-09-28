"use client";

import { useAppSelector } from "@/src/store/hooks";
import { useGetAgentMeQuery } from "@/src/store/api/agent-api";
import type { AgentCapabilities } from "@/src/types/agent";

const NONE: AgentCapabilities = { registerCustomers: false, enrolSchemes: false };

/** Tenant-controlled agent capabilities; the backend enforces them on every /staff request. */
export function useAgentCapabilities(): AgentCapabilities & { loading: boolean } {
  const session = useAppSelector((state) => state.agentSession.session);
  const me = useGetAgentMeQuery(undefined, {
    skip: !session,
    refetchOnMountOrArgChange: 60,
    refetchOnFocus: true,
  });
  const capabilities = me.data?.agentCapabilities ?? session?.user.agentCapabilities ?? NONE;
  return { ...capabilities, loading: me.isLoading };
}
