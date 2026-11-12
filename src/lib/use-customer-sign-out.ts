"use client";

import { useRouter } from "next/navigation";
import { readStoredRefreshToken } from "@/src/lib/auth-token-storage";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerApi, useCustomerLogoutMutation } from "@/src/store/api/customer-api";
import { customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";
import { disconnectCustomerRealtime } from "@/src/lib/customer-realtime";

export function useCustomerSignOut() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug, tenantCode } = useCustomerTenant();
  const [logout, { isLoading }] = useCustomerLogoutMutation();

  const signOut = async () => {
    disconnectCustomerRealtime();
    const refreshToken = readStoredRefreshToken("customer") ?? undefined;
    try {
      await logout({ refreshToken }).unwrap();
    } catch {
      // Always clear local session even if revoke fails.
    }
    if (tenantCode) {
      try {
        sessionStorage.removeItem(`swarnagrow.customer.splashDone.${tenantCode}`);
      } catch {
        /* ignore */
      }
    }
    dispatch(customerSignedOut());
    dispatch(customerApi.util.resetApiState());
    router.push(customerPath(tenantSlug, "login"));
  };

  return { signOut, isSigningOut: isLoading };
}
