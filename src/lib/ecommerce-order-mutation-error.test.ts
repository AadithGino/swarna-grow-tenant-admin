import { describe, expect, it, vi } from "vitest";
import {
  isEcommerceOrderVersionConflict,
  toastEcommerceOrderMutationError,
} from "./ecommerce-order-mutation-error";

describe("ecommerce order mutation errors", () => {
  it("detects version conflicts", () => {
    expect(isEcommerceOrderVersionConflict({ status: 409, data: { error: { code: "VERSION" } } })).toBe(
      true,
    );
  });

  it("refreshes on version conflict", () => {
    const onVersionConflict = vi.fn();
    toastEcommerceOrderMutationError({ status: 409, data: { error: { message: "conflict" } } }, {
      onVersionConflict,
    });
    expect(onVersionConflict).toHaveBeenCalled();
  });
});
