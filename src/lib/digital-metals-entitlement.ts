/** Matches backend `buildDigitalMetalsCapability` (Phase 1). */
export type DigitalMetalsServerAccessState = {
  planEntitled?: boolean;
  enabled?: boolean;
  tenantEnabled?: boolean;
  paused?: boolean;
  active?: boolean;
  hasLegacyActivity?: boolean;
  canViewHoldings?: boolean;
  canViewHistory?: boolean;
  canAccessSettlement?: boolean;
  canAccessFulfilment?: boolean;
  canPlaceNewBuy?: boolean;
  canPlaceNewSell?: boolean;
  canPlaceRedemption?: boolean;
  blockers?: { code: string; message: string }[];
  termsVersion?: string | null;
  termsContentHash?: string | null;
  taxProfileApproved?: boolean;
  assets?: {
    metal: string;
    finenessPpm: number;
    quoteReady?: boolean;
    rateTiming?: string;
    issues?: { code: string; message: string }[];
  }[];
  pause?: {
    tenantPaused?: boolean;
    tenantPauseReason?: string;
    platformPaused?: boolean;
    platformPauseReason?: string;
  };
  implementationPhase?: number;
  workspaceLive?: boolean;
};

export function resolveDigitalMetalsServerAccess(
  subscription?: { digitalMetals?: DigitalMetalsServerAccessState; features?: Record<string, boolean> } | null,
  operations?: { digitalMetals?: DigitalMetalsServerAccessState; digitalMetalsEnabled?: boolean } | null,
): DigitalMetalsServerAccessState | null {
  const fromSubscription = subscription?.digitalMetals;
  if (fromSubscription && typeof fromSubscription === "object") return fromSubscription;
  const fromOperations = operations?.digitalMetals;
  if (fromOperations && typeof fromOperations === "object") return fromOperations;
  if (subscription?.features?.digitalMetals === false) {
    return { planEntitled: false, enabled: false, active: false };
  }
  return null;
}

export function isDigitalMetalsPlanEntitled(
  state: DigitalMetalsServerAccessState | null | undefined,
): boolean {
  return state?.planEntitled === true;
}

export function canViewDigitalMetalsWorkspace(
  state: DigitalMetalsServerAccessState | null | undefined,
): boolean {
  return state?.canViewHoldings === true;
}
