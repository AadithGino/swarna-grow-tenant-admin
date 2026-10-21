"use client";

import {
  useGetDigitalMetalsCapabilityQuery,
  useGetSettingsOperationsQuery,
  useGetSubscriptionQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { hasPermission } from "@/src/lib/permissions";
import {
  canViewDigitalMetalsWorkspace,
  isDigitalMetalsPlanEntitled,
  resolveDigitalMetalsServerAccess,
  type DigitalMetalsServerAccessState,
} from "@/src/lib/digital-metals-entitlement";

export function useDigitalMetalsServerEntitlement() {
  const user = useAppSelector((s) => s.session.session?.user);
  const operations = useGetSettingsOperationsQuery();
  const subscription = useGetSubscriptionQuery();
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, {
    skip: !hasPermission(user, "digital-metals.read"),
  });
  const access =
    (capability.data as DigitalMetalsServerAccessState | undefined)
    ?? resolveDigitalMetalsServerAccess(subscription.data, operations.data);
  const loading =
    (subscription.isLoading || operations.isLoading || capability.isLoading)
    && access == null;
  const planEntitled = isDigitalMetalsPlanEntitled(access);
  const workspaceVisible = canViewDigitalMetalsWorkspace(access);
  return {
    loading,
    access,
    planEntitled,
    workspaceVisible,
    disabledMessage: planEntitled
      ? null
      : "Your plan does not include Digital Gold & Silver. Upgrade to enable the module.",
  };
}

export function useDigitalMetalsWorkspaceNavVisible() {
  const base = useDigitalMetalsServerEntitlement();
  const user = useAppSelector((s) => s.session.session?.user);
  const canRead = hasPermission(user, "digital-metals.read");
  return {
    ...base,
    showDigitalMetalsNav: canRead && (base.workspaceVisible || base.planEntitled),
  };
}
