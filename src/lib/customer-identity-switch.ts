import type { AppDispatch } from "@/src/store";
import { store } from "@/src/store";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { resetCustomerScopedClientState } from "@/src/lib/customer-identity";

function customerIdentityKey(customerId: string, tenantId: string | null | undefined) {
  if (!customerId || !tenantId) return null;
  return `${tenantId}:${customerId}`;
}

function customerIdentityKeyFromAccessToken(access: string | null) {
  if (!access) return null;
  try {
    const payload = JSON.parse(atob(access.split(".")[1] ?? "")) as { sub?: string; tid?: string };
    return customerIdentityKey(payload.sub ?? "", payload.tid);
  } catch {
    return null;
  }
}

export function resetCustomerScopedStateIfAccountSwitch(
  dispatch: AppDispatch,
  next: { customerId: string; tenantId?: string | null },
) {
  const session = store.getState().customerSession;
  const nextTenantId = next.tenantId ?? session.tenantId;
  const nextKey = customerIdentityKey(next.customerId, nextTenantId);
  const sessionKey = customerIdentityKey(session.customerId ?? "", session.tenantId);
  const tokenKey =
    typeof window !== "undefined"
      ? customerIdentityKeyFromAccessToken(localStorage.getItem(TOKEN_KEYS.customer.access))
      : null;
  const prevKey = sessionKey ?? tokenKey;
  if (prevKey && nextKey && prevKey !== nextKey) {
    resetCustomerScopedClientState(dispatch);
  }
}
