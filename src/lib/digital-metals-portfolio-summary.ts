/** Portfolio grouping — never sum grams across metals/purities. */

export type PortfolioWalletRow = {
  id: string;
  metal: string;
  finenessPpm: number;
  heldUg: string | number;
  availableUg: string | number;
  reservedUg: string | number;
  valuationStatus?: string;
  estimatedSaleValue?: { amountPaise?: number } | null;
};

export type PortfolioValuationAggregate = {
  /** Sum of indicative sale values when every wallet row has valuationStatus OK. */
  combinedIndicativePaise: number | null;
  allValuationsOk: boolean;
  anyWallet: boolean;
};

export function aggregatePortfolioValuation(items: PortfolioWalletRow[]): PortfolioValuationAggregate {
  if (!items.length) {
    return { combinedIndicativePaise: null, allValuationsOk: false, anyWallet: false };
  }
  let sum = 0;
  for (const w of items) {
    if (w.valuationStatus !== "OK" || w.estimatedSaleValue?.amountPaise == null) {
      return { combinedIndicativePaise: null, allValuationsOk: false, anyWallet: true };
    }
    const p = Number(w.estimatedSaleValue.amountPaise);
    if (!Number.isFinite(p)) {
      return { combinedIndicativePaise: null, allValuationsOk: false, anyWallet: true };
    }
    sum += p;
  }
  return { combinedIndicativePaise: sum, allValuationsOk: true, anyWallet: true };
}
