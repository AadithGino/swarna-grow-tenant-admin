import { describe, expect, it } from "vitest";
import { aggregatePortfolioValuation } from "@/src/lib/digital-metals-portfolio-summary";

describe("aggregatePortfolioValuation", () => {
  it("returns null combined value when any wallet lacks OK valuation", () => {
    const r = aggregatePortfolioValuation([
      {
        id: "1",
        metal: "GOLD",
        finenessPpm: 999_000,
        heldUg: 1_000_000,
        availableUg: 1_000_000,
        reservedUg: 0,
        valuationStatus: "OK",
        estimatedSaleValue: { amountPaise: 100_00 },
      },
      {
        id: "2",
        metal: "SILVER",
        finenessPpm: 999_000,
        heldUg: 2_000_000,
        availableUg: 2_000_000,
        reservedUg: 0,
        valuationStatus: "STALE_RATE",
      },
    ]);
    expect(r.allValuationsOk).toBe(false);
    expect(r.combinedIndicativePaise).toBeNull();
  });

  it("sums paise only when every wallet is OK", () => {
    const r = aggregatePortfolioValuation([
      {
        id: "1",
        metal: "GOLD",
        finenessPpm: 999_000,
        heldUg: 1_000_000,
        availableUg: 1_000_000,
        reservedUg: 0,
        valuationStatus: "OK",
        estimatedSaleValue: { amountPaise: 100_00 },
      },
      {
        id: "2",
        metal: "SILVER",
        finenessPpm: 999_000,
        heldUg: 1_000_000,
        availableUg: 1_000_000,
        reservedUg: 0,
        valuationStatus: "OK",
        estimatedSaleValue: { amountPaise: 50_00 },
      },
    ]);
    expect(r.allValuationsOk).toBe(true);
    expect(r.combinedIndicativePaise).toBe(150_00);
  });
});
