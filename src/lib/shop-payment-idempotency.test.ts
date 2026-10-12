import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readShopPaymentAttemptId,
  readShopPaymentIdempotencyKey,
  saveShopPaymentAttemptId,
  saveShopPaymentIdempotencyKey,
} from "@/src/lib/shop-payment-idempotency";

describe("shop-payment-idempotency", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    };
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);
  });

  it("persists idempotency and attempt ids per order", () => {
    saveShopPaymentIdempotencyKey("ord-1", "idem-abc12345");
    saveShopPaymentAttemptId("ord-1", "epay-1");
    expect(readShopPaymentIdempotencyKey("ord-1")).toBe("idem-abc12345");
    expect(readShopPaymentAttemptId("ord-1")).toBe("epay-1");
    expect(readShopPaymentIdempotencyKey("ord-2")).toBeNull();
  });
});
