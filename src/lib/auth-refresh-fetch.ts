import { env } from "@/src/config/env";
import { storeAuthTokens } from "@/src/lib/auth-session";
import { parseRefreshTokens } from "@/src/lib/auth-tokens-from-refresh";

const CUSTOMER_ACCESS = "swarnagrow.customer.accessToken";
const CUSTOMER_REFRESH = "swarnagrow.customer.refreshToken";

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
  const refreshToken = localStorage.getItem("swarnagrow.refreshToken");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  storeAuthTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

/** Refresh customer app access token using stored refresh token. */
export async function refreshCustomerAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = localStorage.getItem(CUSTOMER_REFRESH);
  if (!refreshToken) return false;
  const tokens = await postRefresh("/app/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  localStorage.setItem(CUSTOMER_ACCESS, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(CUSTOMER_REFRESH, tokens.refreshToken);
  }
  return true;
}

/** Refresh platform access token using stored refresh token. */
export async function refreshPlatformAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = localStorage.getItem("swarnagrow.platformRefreshToken");
  if (!refreshToken) return false;
  const tokens = await postRefresh("/platform/auth/refresh", refreshToken);
  if (!tokens?.accessToken) return false;
  localStorage.setItem("swarnagrow.platformAccessToken", tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem("swarnagrow.platformRefreshToken", tokens.refreshToken);
  }
  return true;
}
