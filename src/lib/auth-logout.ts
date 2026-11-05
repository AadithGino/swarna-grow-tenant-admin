import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { AppDispatch } from "@/src/store";
import { adminApi } from "@/src/store/api/admin-api";
import { agentApi } from "@/src/store/api/agent-api";
import { customerApi } from "@/src/store/api/customer-api";
import { platformApi } from "@/src/store/api/platform-api";
import { CUSTOMER_ROUTE_SECTIONS } from "@/src/lib/customer-tenant";
import { clearPlatformTokens } from "@/src/lib/auth-token-storage";
import { customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { clearAgentSession } from "@/src/store/slices/agent-session-slice";
import { clearSession } from "@/src/store/slices/session-slice";

let tenantLogoutStarted = false;
let platformLogoutStarted = false;
let customerLogoutStarted = false;
let agentLogoutStarted = false;

/** Allow a new forced sign-out after the user returns to a login screen. */
export function resetAuthLogoutGuards() {
  tenantLogoutStarted = false;
  platformLogoutStarted = false;
  customerLogoutStarted = false;
  agentLogoutStarted = false;
}

export function clearPlatformAuthStorage() {
  clearPlatformTokens();
}

export function isUnauthorizedFetchError(
  error: FetchBaseQueryError | undefined,
): boolean {
  if (!error) return false;
  if (error.status === 401) return true;
  if (error.status !== "CUSTOM_ERROR" || !error.data || typeof error.data !== "object") {
    return false;
  }
  const data = error.data as {
    httpStatus?: number;
    code?: string;
    error?: { code?: string };
  };
  if (data.httpStatus === 401) return true;
  const code = data.error?.code ?? data.code;
  return code === "UNAUTHORIZED" || code === "UNAUTHENTICATED";
}

function loginPathWithReturn(fallback: string) {
  const path =
    typeof window !== "undefined" ? window.location.pathname : fallback;
  return `${fallback}?next=${encodeURIComponent(path)}`;
}

/** Clear tenant session, cache, and redirect to jeweller login. */
export function handleTenantUnauthorized(dispatch: AppDispatch) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/login" || path.startsWith("/login/")) return;
  if (tenantLogoutStarted) return;
  tenantLogoutStarted = true;

  dispatch(clearSession());
  dispatch(adminApi.util.resetApiState());
  window.location.assign(loginPathWithReturn("/login"));
}

/** Clear customer session, cache, and redirect to customer login. */
export function handleCustomerUnauthorized(dispatch: AppDispatch) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.includes("/customer/") && path.endsWith("/login")) return;
  if (customerLogoutStarted) return;
  customerLogoutStarted = true;

  dispatch(customerSignedOut());
  dispatch(customerApi.util.resetApiState());

  const segments = path.split("/").filter(Boolean);
  const tenantSlug =
    segments[0] === "customer" &&
    segments[1] &&
    !CUSTOMER_ROUTE_SECTIONS.has(segments[1])
      ? segments[1]
      : null;
  const loginBase = tenantSlug
    ? `/customer/${tenantSlug}/login`
    : "/customer/login";
  window.location.assign(loginPathWithReturn(loginBase));
}

/** Clear platform session, cache, and redirect to platform login. */
export function handlePlatformUnauthorized(dispatch: AppDispatch) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/platform/login" || path.startsWith("/platform/login/")) {
    return;
  }
  if (platformLogoutStarted) return;
  platformLogoutStarted = true;

  clearPlatformAuthStorage();
  dispatch(platformApi.util.resetApiState());
  window.location.assign(loginPathWithReturn("/platform/login"));
}

/** Clear agent session, cache, and redirect to agent login. */
export function handleAgentUnauthorized(dispatch: AppDispatch) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/agent/login" || path.startsWith("/agent/login/")) return;
  if (agentLogoutStarted) return;
  agentLogoutStarted = true;

  dispatch(clearAgentSession());
  dispatch(agentApi.util.resetApiState());
  window.location.assign(loginPathWithReturn("/agent/login"));
}
