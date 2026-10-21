import { describe, expect, it } from "vitest";
import {
  canViewDigitalMetalsWorkspace,
  isDigitalMetalsPlanEntitled,
  resolveDigitalMetalsServerAccess,
} from "./digital-metals-entitlement";

describe("digital metals entitlement", () => {
  it("prefers subscription digitalMetals over operations", () => {
    const state = resolveDigitalMetalsServerAccess(
      { digitalMetals: { planEntitled: true, enabled: true, canViewHoldings: true } },
      { digitalMetals: { planEntitled: false, enabled: false, canViewHoldings: false } },
    );
    expect(isDigitalMetalsPlanEntitled(state)).toBe(true);
    expect(canViewDigitalMetalsWorkspace(state)).toBe(true);
  });

  it("treats explicit plan feature false as not entitled", () => {
    const state = resolveDigitalMetalsServerAccess(
      { features: { digitalMetals: false } } as never,
      null,
    );
    expect(isDigitalMetalsPlanEntitled(state)).toBe(false);
    expect(canViewDigitalMetalsWorkspace(state)).toBe(false);
  });

  it("allows workspace when legacy holdings flag is set", () => {
    expect(
      canViewDigitalMetalsWorkspace({
        planEntitled: false,
        enabled: false,
        canViewHoldings: true,
      }),
    ).toBe(true);
  });

  it("surfaces per-asset readiness and pause metadata from capability DTO", () => {
    const state = {
      planEntitled: true,
      enabled: true,
      canViewHoldings: true,
      assets: [{ metal: "GOLD", finenessPpm: 999000, quoteReady: false }],
      pause: { tenantPaused: true, tenantPauseReason: "Risk review", platformPaused: false },
    };
    expect(state.assets?.[0]?.metal).toBe("GOLD");
    expect(state.pause?.tenantPaused).toBe(true);
  });
});
