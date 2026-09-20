"use client";

import { useRouter } from "next/navigation";
import { readStoredRefreshToken } from "@/src/lib/auth-token-storage";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerApi, useCustomerLogoutMutation } from "@/src/store/api/customer-api";
import { customerSignedOut } from "@/src/store/slices/customer-session-slice";
import { useAppDispatch } from "@/src/store/hooks";

export function useCustomerSignOut() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug } = useCustomerTenant();
  const [logout, { isLoading }] = useCustomerLogoutMutation();

  const signOut = async () => {
    const refreshToken = readStoredRefreshToken("customer") ?? undefined;
    try {
      await logout({ refreshToken }).unwrap();
    } catch {
      // Always clear local session even if revoke fails.
    }
    dispatch(customerSignedOut());
    dispatch(customerApi.util.resetApiState());
    router.push(customerPath(tenantSlug, "login"));
  };

  return { signOut, isSigningOut: isLoading };
}
