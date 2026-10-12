import { describe, expect, it } from "vitest";
import {
  cancelStockDispositionError,
  cancelStockDispositionRequired,
} from "./ecommerce-order-stock-disposition";

describe("cancel stock disposition", () => {
  it("requires explicit choice before approve", () => {
    expect(cancelStockDispositionRequired("")).toBe(false);
    expect(cancelStockDispositionError("")).toMatch(/Choose/i);
    expect(cancelStockDispositionRequired("RESTOCK_CONFIRMED")).toBe(true);
    expect(cancelStockDispositionError("RESTOCK_CONFIRMED")).toBeNull();
  });
});
