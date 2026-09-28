"use client";

import { useEffect, useState } from "react";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerNeedsOnboarding } from "@/src/lib/customer-profile-complete";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetCustomerProfileQuery } from "@/src/store/api/customer-api";
import { useAppSelector } from "@/src/store/hooks";

/** Redirects unauthenticated or incomplete profiles away from the main portal shell. */
export function CustomerRegistrationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const authenticated = useAppSelector((s) => s.customerSession.authenticated);
  const sessionProfileComplete = useAppSelector(
    (s) => s.customerSession.profileComplete,
  );
  const [tokenPresent, setTokenPresent] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenPresent(
      Boolean(
        localStorage.getItem(TOKEN_KEYS.customer.access) ||
          localStorage.getItem(TOKEN_KEYS.customer.refresh),
      ),
    );
    setReady(true);
  }, []);

  const hasSession = tokenPresent || authenticated;
  const { data: profile, isLoading } = useGetCustomerProfileQuery(undefined, {
    skip: !ready || !hasSession,
  });

  const needsOnboarding =
    sessionProfileComplete !== true && customerNeedsOnboarding(profile);

  useEffect(() => {
    if (!ready) return;
    if (!hasSession) {
      router.replace(customerPath(tenantSlug, "login"));
      return;
    }
    if (needsOnboarding) {
      router.replace(customerPath(tenantSlug, "onboarding"));
    }
  }, [ready, hasSession, needsOnboarding, router, tenantSlug]);

  if (!ready || !hasSession || isLoading) {
    return <PageSkeleton />;
  }
  if (needsOnboarding) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
