import { agentPortalLoginPath } from "@/src/lib/agent-tenant";

export function agentPortalLoginUrl(tenantCode: string): string {
  const path = agentPortalLoginPath(tenantCode);
  if (typeof window === "undefined") return path;
  return `${window.location.origin.replace(/\/$/, "")}${path}`;
}
