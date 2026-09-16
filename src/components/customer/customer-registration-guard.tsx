"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerNeedsOnboarding } from "@/src/lib/customer-profile-complete";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetCustomerProfileQuery } from "@/src/store/api/customer-api";
import { useAppSelector } from "@/src/store/hooks";

function hasCustomerToken() {
  return typeof window !== "undefined" && Boolean(localStorage.getItem("swarnagrow.customer.accessToken"));
}

/** Redirects unauthenticated or incomplete profiles away from the main portal shell. */
export function CustomerRegistrationGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const authenticated = useAppSelector((s) => s.customerSession.authenticated);
  const sessionProfileComplete = useAppSelector((s) => s.customerSession.profileComplete);
  const tokenPresent = hasCustomerToken();
  const { data: profile, isLoading } = useGetCustomerProfileQuery(undefined, {
    skip: !tokenPresent && !authenticated,
  });

  const needsOnboarding =
    sessionProfileComplete !== true && customerNeedsOnboarding(profile);

  useEffect(() => {
    if (!tokenPresent && !authenticated) {
      router.replace(customerPath(tenantSlug, "login"));
      return;
    }
    if (needsOnboarding) {
      router.replace(customerPath(tenantSlug, "onboarding"));
    }
  }, [tokenPresent, authenticated, needsOnboarding, router, tenantSlug]);

  if ((!tokenPresent && !authenticated) || isLoading) {
    return <PageSkeleton />;
  }
  if (needsOnboarding) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
