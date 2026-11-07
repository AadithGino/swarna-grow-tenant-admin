"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  customerUrlTenantMatchesSession,
  resetCustomerScopedClientState,
} from "@/src/lib/customer-identity";
import { customerPath, tenantCodeToSlug } from "@/src/lib/customer-tenant";
import { useCustomerSignOut } from "@/src/lib/use-customer-sign-out";
import { useGetCustomerProfileQuery } from "@/src/store/api/customer-api";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { useClientMounted } from "@/src/hooks/use-client-mounted";

type CustomerIdentityContextValue = {
  /** Server-confirmed tenant/customer; protected queries may run. */
  ready: boolean;
  sessionTenantId: string | null;
  sessionCustomerId: string | null;
  sessionTenantCode: string | null;
  mismatch: boolean;
};

const CustomerIdentityContext = createContext<CustomerIdentityContextValue | null>(null);
const CONFIRMED_IDENTITY_KEY = "swarnagrow.customerConfirmedIdentityKey";

function readConfirmedIdentityKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CONFIRMED_IDENTITY_KEY);
}

function writeConfirmedIdentityKey(value: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONFIRMED_IDENTITY_KEY, value);
}

function hasStoredCustomerTokens() {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem(TOKEN_KEYS.customer.access) ||
      localStorage.getItem(TOKEN_KEYS.customer.refresh),
  );
}

export function CustomerIdentityProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const mounted = useClientMounted();
  const { tenant } = useCustomerTenant();
  const urlTenantId = tenant?.id ?? null;
  const authenticated = useAppSelector((s) => s.customerSession.authenticated);
  const sessionTenantId = useAppSelector((s) => s.customerSession.tenantId ?? null);
  const sessionCustomerId = useAppSelector((s) => s.customerSession.customerId ?? null);
  const sessionTenantCode = useAppSelector((s) => s.customerSession.tenantCode ?? null);
  const identityRevalidating = useAppSelector((s) => s.customerSession.identityRevalidating);
  const sessionGeneration = useAppSelector((s) => s.customerSession.sessionGeneration);
  const profileConfirmedGeneration = useAppSelector(
    (s) => s.customerSession.profileConfirmedGeneration,
  );
  const sessionConfirmed =
    profileConfirmedGeneration >= 0 && profileConfirmedGeneration === sessionGeneration;
  const { signOut } = useCustomerSignOut();
  const lastTransitionKey = useRef<string | null>(null);

  const hasSession = mounted && (authenticated || hasStoredCustomerTokens());

  const { data: profile, isLoading, isFetching, isError } = useGetCustomerProfileQuery(undefined, {
    skip: !hasSession,
  });

  const confirmedTenantId = profile?.tenantId ?? sessionTenantId;
  const confirmedCustomerId = profile?.id ?? sessionCustomerId;
  const mismatch =
    Boolean(hasSession && profile && urlTenantId && confirmedTenantId) &&
    !customerUrlTenantMatchesSession(urlTenantId, confirmedTenantId);

  useEffect(() => {
    if (!sessionConfirmed || !profile?.tenantId || !profile?.id) return;
    const transitionKey = `${profile.tenantId}:${profile.id}`;
    const prevKey = readConfirmedIdentityKey() ?? lastTransitionKey.current;
    if (prevKey && prevKey !== transitionKey) {
      resetCustomerScopedClientState(dispatch);
    }
    lastTransitionKey.current = transitionKey;
    writeConfirmedIdentityKey(transitionKey);
  }, [sessionConfirmed, profile?.tenantId, profile?.id, dispatch]);

  const profileMatchesSession =
    Boolean(profile?.tenantId && profile?.id) &&
    (!sessionCustomerId || sessionCustomerId === profile?.id) &&
    (!sessionTenantId || sessionTenantId === profile?.tenantId);

  const ready =
    hasSession &&
    profileMatchesSession &&
    Boolean(urlTenantId) &&
    !mismatch &&
    customerUrlTenantMatchesSession(urlTenantId, profile?.tenantId) &&
    !identityRevalidating &&
    sessionConfirmed;

  const value = useMemo(
    (): CustomerIdentityContextValue => ({
      ready,
      sessionTenantId: confirmedTenantId,
      sessionCustomerId: confirmedCustomerId,
      sessionTenantCode: profile?.tenant?.tenantCode ?? sessionTenantCode,
      mismatch,
    }),
    [
      ready,
      confirmedTenantId,
      confirmedCustomerId,
      profile?.tenant?.tenantCode,
      sessionTenantCode,
      mismatch,
    ],
  );

  if (!hasSession) {
    return (
      <CustomerIdentityContext.Provider value={value}>{children}</CustomerIdentityContext.Provider>
    );
  }

  if (
    isLoading
    || isFetching
    || identityRevalidating
    || !sessionConfirmed
    || (!profile && !isError)
  ) {
    return (
      <CustomerIdentityContext.Provider value={value}>
        <PageSkeleton cards={2} />
      </CustomerIdentityContext.Provider>
    );
  }

  if (mismatch && profile) {
    const homeSlug = tenantCodeToSlug(profile.tenant?.tenantCode ?? sessionTenantCode ?? "home");
    return (
      <CustomerIdentityContext.Provider value={value}>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-[#171722]">Different jeweller account</h1>
          <p className="text-sm text-[#77727c]">
            You are signed in to {profile.tenant?.displayName ?? "another store"}. This link is for{" "}
            {tenant?.displayName ?? "a different store"}.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={customerPath(homeSlug)}>Go to my store</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void signOut();
              }}
            >
              Sign in here instead
            </Button>
          </div>
        </div>
      </CustomerIdentityContext.Provider>
    );
  }

  return (
    <CustomerIdentityContext.Provider value={value}>{children}</CustomerIdentityContext.Provider>
  );
}

export function useCustomerIdentity(): CustomerIdentityContextValue {
  const ctx = useContext(CustomerIdentityContext);
  if (!ctx) {
    throw new Error("useCustomerIdentity must be used within CustomerIdentityProvider");
  }
  return ctx;
}
