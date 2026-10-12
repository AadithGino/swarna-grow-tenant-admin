export type EcommerceCancelStockDisposition = "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION";

export type EcommerceCancelStockDispositionChoice = EcommerceCancelStockDisposition | "";

export function cancelStockDispositionRequired(
  choice: EcommerceCancelStockDispositionChoice,
): choice is EcommerceCancelStockDisposition {
  return choice === "RESTOCK_CONFIRMED" || choice === "STOCK_EXCEPTION";
}

export function cancelStockDispositionError(choice: EcommerceCancelStockDispositionChoice) {
  if (cancelStockDispositionRequired(choice)) return null;
  return "Choose whether cancelled stock is restocked or flagged as a stock exception.";
}
