import { env } from "@/src/config/env";
import {
  persistAgentTokens,
  persistCustomerTokens,
  persistPlatformTokens,
  persistTenantTokens,
  readStoredRefreshToken,
} from "@/src/lib/auth-token-storage";
import { parseRefreshTokens } from "@/src/lib/auth-tokens-from-refresh";

function apiUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  return `${base}/${suffix}`;
}

async function postRefresh(
  path: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  try {
    const body = await response.json();
    return parseRefreshTokens(body);
  } catch {
    return null;
  }
}

/** Refresh tenant (admin) access token using stored refresh token. */
export async function refreshTenantAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = readStoredRefreshToken("tenant");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  persistTenantTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

/** Refresh customer app access token using stored refresh token. */
export async function refreshCustomerAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = readStoredRefreshToken("customer");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/app/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  persistCustomerTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

/** Refresh platform access token using stored refresh token. */
export async function refreshPlatformAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = readStoredRefreshToken("platform");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/platform/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  persistPlatformTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

/** Refresh agent/collector access token using stored refresh token. */
export async function refreshAgentAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = readStoredRefreshToken("agent");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  persistAgentTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}
