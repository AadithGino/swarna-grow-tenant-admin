import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";

const rateSnap = {
  buyRatePerGramPaise: 600_000,
  sellRatePerGramPaise: 595_000,
  rateVersionId: "dmrv_test",
};

describe("DigitalMetalsQuoteBreakdown", () => {
  afterEach(() => cleanup());
  it("renders buy quote with fee-free budget remainder", () => {
    render(
      <DigitalMetalsQuoteBreakdown
        quote={{
          side: "BUY",
          metalQuantityUg: "1000000",
          metalSubtotalPaise: 600_000,
          feePaise: 0,
          feeLines: [],
          taxPaise: 0,
          taxLines: [],
          totalPayablePaise: 600_000,
          budgetRemainderPaise: 40_000,
          rateSnapshot: rateSnap,
        }}
      />,
    );
    expect(screen.getByTestId("dm-quote-breakdown").getAttribute("data-quote-side")).toBe("BUY");
    expect(screen.getByText("Buy quote")).toBeTruthy();
    expect(screen.getByText("Total payable")).toBeTruthy();
    expect(screen.getAllByText("₹6,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Unused from your budget")).toBeTruthy();
    expect(screen.getByText("₹400.00")).toBeTruthy();
    expect(screen.getAllByText("₹0.00").length).toBeGreaterThanOrEqual(2);
  });

  it("renders buy quote with taxes and fee lines", () => {
    render(
      <DigitalMetalsQuoteBreakdown
        quote={{
          side: "BUY",
          metalQuantityUg: "1000000",
          metalSubtotalPaise: 600_000,
          feePaise: 6_000,
          feeLines: [{ code: "BUY_FEE", amountPaise: 6_000 }],
          taxPaise: 1_080,
          taxLines: [{ code: "GST", label: "GST 18%", amountPaise: 1_080, ratePercent: 18 }],
          totalPayablePaise: 607_080,
          budgetRemainderPaise: 0,
          rateSnapshot: rateSnap,
        }}
      />,
    );
    expect(screen.getByText("BUY_FEE")).toBeTruthy();
    expect(screen.getByText("GST 18%")).toBeTruthy();
    expect(screen.getByText("₹6,070.80")).toBeTruthy();
  });

  it("renders sell settlement not buy total", () => {
    render(
      <DigitalMetalsQuoteBreakdown
        quote={{
          side: "SELL",
          metalQuantityUg: "2000000",
          metalSubtotalPaise: 1_190_000,
          feePaise: 500,
          feeLines: [{ code: "SELL_FEE", amountPaise: 500 }],
          taxPaise: 0,
          taxLines: [],
          settlementPaise: 1_189_500,
          totalPayablePaise: 999_999,
          rateSnapshot: rateSnap,
        }}
      />,
    );
    expect(screen.getByTestId("dm-quote-breakdown").getAttribute("data-quote-side")).toBe("SELL");
    expect(screen.getByText("Sell quote")).toBeTruthy();
    expect(screen.getByText("Net settlement to you")).toBeTruthy();
    expect(screen.getByText("₹11,895.00")).toBeTruthy();
    expect(screen.queryByText("Total payable")).toBeNull();
  });

  it("shows unavailable rate without inventing zero", () => {
    render(
      <DigitalMetalsQuoteBreakdown
        quote={{
          side: "BUY",
          metalQuantityUg: "1000000",
          metalSubtotalPaise: 600_000,
          feePaise: 0,
          taxPaise: 0,
          totalPayablePaise: 600_000,
        }}
      />,
    );
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });
});
