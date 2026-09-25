import { tenantCodeToSlug, tenantSlugToCode } from "@/src/lib/customer-tenant";

/** Path segments under `/agent/:tenant?/…` that are routes, not tenant slugs. */
export const AGENT_ROUTE_SECTIONS = new Set([
  "login",
  "collect",
  "customers",
  "history",
  "handover",
  "report",
  "account",
]);

export type ParsedAgentPath = {
  tenantSlug: string | null;
  section: string;
  id?: string;
  detail?: string;
};

/** Parses `slug` from `PortalRouter` when `slug[0] === "agent"`. */
export function parseAgentSlug(slug: string[]): ParsedAgentPath {
  const rest = slug.slice(1);
  if (!rest.length) return { tenantSlug: null, section: "" };
  if (AGENT_ROUTE_SECTIONS.has(rest[0])) {
    return {
      tenantSlug: null,
      section: rest[0],
      id: rest[1],
      detail: rest[2],
    };
  }
  return {
    tenantSlug: rest[0],
    section: rest[1] ?? "",
    id: rest[2],
    detail: rest[3],
  };
}

export function agentBasePath(tenantSlug: string | null | undefined): string {
  if (tenantSlug) return `/agent/${tenantSlug}`;
  return "/agent";
}

export function agentPath(
  tenantSlug: string | null | undefined,
  ...segments: string[]
): string {
  const base = agentBasePath(tenantSlug);
  const tail = segments.filter(Boolean).join("/");
  return tail ? `${base}/${tail}` : base;
}

export const AGENT_TENANT_SLUG_STORAGE_KEY = "swarnagrow.agent.tenantSlug";

/** Path-only agent login URL (e.g. `/agent/kairali/login`). */
export function agentPortalLoginPath(tenantCode: string): string {
  return agentPath(tenantCodeToSlug(tenantCode), "login");
}

export function agentPortalLoginPathFromSlug(tenantSlug: string): string {
  return agentPath(tenantSlug, "login");
}

export function agentTenantSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "agent" || !parts[1]) return null;
  if (AGENT_ROUTE_SECTIONS.has(parts[1])) return null;
  return parts[1];
}

export function agentLoginPathForTenantCode(tenantCode: string | undefined): string {
  if (!tenantCode) return "/agent/login";
  return agentPortalLoginPath(tenantCode);
}

/** Where to send an unauthenticated agent (path only). */
export function agentSignInRedirectPath(
  session?: {
    selectedTenant?: { tenantCode?: string };
    user?: { tenantCode?: string };
  } | null,
): string {
  if (typeof window !== "undefined") {
    const fromPath = agentTenantSlugFromPathname(window.location.pathname);
    if (fromPath) return agentPortalLoginPathFromSlug(fromPath);
    const stored = localStorage.getItem(AGENT_TENANT_SLUG_STORAGE_KEY);
    if (stored) return agentPortalLoginPathFromSlug(stored);
  }
  const code =
    session?.selectedTenant?.tenantCode ?? session?.user?.tenantCode;
  return agentLoginPathForTenantCode(code);
}

export { tenantSlugToCode, tenantCodeToSlug };
