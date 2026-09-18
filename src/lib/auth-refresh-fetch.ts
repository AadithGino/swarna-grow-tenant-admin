import { refreshAuthRealm } from "@/src/lib/auth-refresh-api";

/** Refresh tenant (admin) access token using stored refresh token. */
export async function refreshTenantAccessToken(): Promise<boolean> {
  const tokens = await refreshAuthRealm("tenant");
  return Boolean(tokens?.accessToken);
}

/** Refresh customer app access token using stored refresh token. */
export async function refreshCustomerAccessToken(): Promise<boolean> {
  const tokens = await refreshAuthRealm("customer");
  return Boolean(tokens?.accessToken);
}

/** Refresh platform access token using stored refresh token. */
export async function refreshPlatformAccessToken(): Promise<boolean> {
  const tokens = await refreshAuthRealm("platform");
  return Boolean(tokens?.accessToken);
}

/** Refresh agent/collector access token using stored refresh token. */
export async function refreshAgentAccessToken(): Promise<boolean> {
  const tokens = await refreshAuthRealm("agent");
  return Boolean(tokens?.accessToken);
}
