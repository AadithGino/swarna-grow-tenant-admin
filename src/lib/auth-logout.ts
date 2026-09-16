import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { AppDispatch } from "@/src/store";
import { adminApi } from "@/src/store/api/admin-api";
import { platformApi } from "@/src/store/api/platform-api";
import { clearSession } from "@/src/store/slices/session-slice";

const PLATFORM_ACCESS = "swarnagrow.platformAccessToken";
const PLATFORM_REFRESH = "swarnagrow.platformRefreshToken";
const PLATFORM_USER = "swarnagrow.platformUser";

let tenantLogoutStarted = false;
let platformLogoutStarted = false;

export function clearPlatformAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLATFORM_ACCESS);
  localStorage.removeItem(PLATFORM_REFRESH);
  localStorage.removeItem(PLATFORM_USER);
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
