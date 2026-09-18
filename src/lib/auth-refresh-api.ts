import { env } from "@/src/config/env";
import {
  coordinateTokenRefresh,
  type RefreshTokenPayload,
} from "@/src/lib/auth-refresh-coordinator";
import {
  persistAgentTokens,
  persistCustomerTokens,
  persistPlatformTokens,
  persistTenantTokens,
  readStoredRefreshToken,
  type AuthRealm,
} from "@/src/lib/auth-token-storage";
import { parseRefreshTokens } from "@/src/lib/auth-tokens-from-refresh";

const REFRESH_PATH: Record<AuthRealm, string> = {
  tenant: "/auth/refresh",
  customer: "/app/auth/refresh",
  platform: "/platform/auth/refresh",
  agent: "/auth/refresh",
};

const PERSIST: Record<
  AuthRealm,
  (accessToken: string, refreshToken?: string) => void
> = {
  tenant: persistTenantTokens,
  customer: persistCustomerTokens,
  platform: persistPlatformTokens,
  agent: persistAgentTokens,
};

function apiUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

function refreshErrorCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const row = body as {
    error?: { code?: string };
    code?: string;
  };
  return row.error?.code ?? row.code ?? null;
}

async function postRefreshOnce(
  path: string,
  refreshToken: string,
): Promise<{ tokens: RefreshTokenPayload; retryable: boolean }> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (response.ok) {
    try {
      const body = await response.json();
      return { tokens: parseRefreshTokens(body), retryable: false };
    } catch {
      return { tokens: null, retryable: false };
    }
  }
  let retryable = false;
  try {
    const body = await response.json();
    const code = refreshErrorCode(body);
    retryable =
      code === "TOKEN_ALREADY_ROTATED" ||
      code === "TOKEN_REUSE_DETECTED" ||
      response.status === 401;
  } catch {
    retryable = response.status === 401;
  }
  return { tokens: null, retryable };
}

async function refreshRealmOnce(realm: AuthRealm): Promise<RefreshTokenPayload> {
  const path = REFRESH_PATH[realm];
  let refreshToken = readStoredRefreshToken(realm);
  if (!refreshToken) return null;

  for (let attemptIndex = 0; attemptIndex < 3; attemptIndex += 1) {
    const attempt = await postRefreshOnce(path, refreshToken);
    if (attempt.tokens?.accessToken) {
      PERSIST[realm](attempt.tokens.accessToken, attempt.tokens.refreshToken);
      return attempt.tokens;
    }
    if (!attempt.retryable) break;

    await new Promise((resolve) => setTimeout(resolve, 120 * (attemptIndex + 1)));
    const rotated = readStoredRefreshToken(realm);
    if (!rotated) break;
    refreshToken = rotated;
  }

  return null;
}

/** True when the client should sign out after a failed refresh (no recoverable session). */
export function shouldLogoutAfterRefreshFailure(realm: AuthRealm): boolean {
  return !readStoredRefreshToken(realm);
}

/** Refresh access token for a realm; concurrent callers share one in-flight request. */
export function refreshAuthRealm(realm: AuthRealm): Promise<RefreshTokenPayload> {
  return coordinateTokenRefresh(realm, () => refreshRealmOnce(realm));
}
