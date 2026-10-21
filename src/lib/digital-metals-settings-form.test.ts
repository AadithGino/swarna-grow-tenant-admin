import { describe, expect, it } from "vitest";
import {
  currentMatchesSettingsAsset,
  feeFromApi,
  feeToApi,
  settingsIdentity,
  taxFromApi,
} from "@/src/features/digital-metals/digital-metals-config-editor";

describe("digital metals settings form binding", () => {
  it("uses distinct identities for gold v1 vs silver v1", () => {
    const gold = { id: "a1", metal: "GOLD", finenessPpm: 999_000, version: 1, buyFee: { type: "FLAT_INR", amountPaise: 100 } };
    const silver = { id: "b1", metal: "SILVER", finenessPpm: 999_000, version: 1, buyFee: { type: "FLAT_INR", amountPaise: 200 } };
    expect(settingsIdentity(gold)).not.toEqual(settingsIdentity(silver));
    expect(feeFromApi(gold.buyFee as Record<string, unknown>).amountPaise).toBe("1");
    expect(feeFromApi(silver.buyFee as Record<string, unknown>).amountPaise).toBe("2");
  });

  it("does not treat stale RTK row as matching a different selected asset", () => {
    const staleGold = { id: "a1", metal: "GOLD", finenessPpm: 999_000, version: 1 };
    expect(currentMatchesSettingsAsset(staleGold, "SILVER", 999_000)).toBe(false);
    expect(currentMatchesSettingsAsset(staleGold, "GOLD", 999_000)).toBe(true);
  });

  it("preserves zero fee values and tax lines from API", () => {
    expect(feeToApi({ type: "FLAT_INR", amountPaise: "0", percent: "", minPaise: "", maxPaise: "" }).amountPaise).toBe(0);
    expect(feeToApi({ type: "FLAT_INR", amountPaise: "12.50", percent: "", minPaise: "", maxPaise: "" }).amountPaise).toBe(1250);
    const taxes = taxFromApi([{ code: "GST", label: "GST", base: "METAL_SUBTOTAL", ratePercent: 0, active: true }]);
    expect(taxes[0]?.ratePercent).toBe("0");
  });
});
