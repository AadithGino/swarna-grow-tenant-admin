import {
  clearTenantTokens,
  persistTenantTokens,
} from "@/src/lib/auth-token-storage";
import type { PortalSession } from "@/src/types/session";

const DEFAULT_CAPABILITIES = {
  multiBranch: true,
  flexibleScheme: true,
  goldWeightScheme: true,
  prematureRedemption: true,
  onlinePayments: true,
  selfEnrolEnabled: true,
} as const;

export function storeAuthTokens(accessToken: string, refreshToken?: string) {
  persistTenantTokens(accessToken, refreshToken);
}

export function clearAuthTokens() {
  clearTenantTokens();
}

export function portalSessionFromLogin(data: {
  accessToken: string;
  refreshToken?: string;
  user: {
    id?: string;
    _id?: string;
    name?: string;
    mobile?: string;
    role?: string;
    tenantId?: string;
    branchId?: string;
    permissions?: string[];
    mustSetPassword?: boolean;
    branch?: { id?: string; name?: string; code?: string };
  };
  tenant?: {
    id?: string;
    tenantCode?: string;
    code?: string;
    displayName?: string;
    name?: string;
    status?: string;
  };
  mobile?: string;
}): PortalSession {
  if (data.refreshToken) {
    storeAuthTokens(data.accessToken, data.refreshToken);
  } else {
    storeAuthTokens(data.accessToken);
  }

  const user = data.user ?? {};
  const tenantId = String(user.tenantId ?? data.tenant?.id ?? "");
  const tenantCode =
    data.tenant?.tenantCode ?? data.tenant?.code ?? tenantId ?? "";
  const displayName =
    data.tenant?.displayName ??
    data.tenant?.name ??
    user.name ??
    tenantCode;

  return {
    accessToken: data.accessToken,
    user: {
      id: String(user.id ?? user._id ?? ""),
      name: user.name ?? "User",
      mobile: data.mobile ?? user.mobile ?? "",
      role: user.role ?? "TENANT_USER",
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      branch: user.branch
        ? {
            id: String(user.branch.id ?? ""),
            name: user.branch.name ?? "—",
            code: user.branch.code ?? "",
          }
        : user.branchId
          ? { id: String(user.branchId), name: "—", code: "" }
          : undefined,
    },
    tenant: {
      id: tenantId,
      tenantCode,
      displayName,
      status: data.tenant?.status ?? "ACTIVE",
    },
    capabilities: { ...DEFAULT_CAPABILITIES },
    setupComplete: true,
  };
}
