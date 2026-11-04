/* @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCustomerDigitalMetalsVisible } from "./customer-digital-metals-visible";

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "kairali" }),
}));

const capabilityQuery = vi.fn(() => ({
  data: { canViewHoldings: true },
  isLoading: false,
  isFetching: false,
  isError: false,
}));

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsCapabilityQuery: () => capabilityQuery(),
}));

describe("useCustomerDigitalMetalsVisible", () => {
  it("is visible when capability allows viewing holdings", () => {
    const { result } = renderHook(() => useCustomerDigitalMetalsVisible());
    expect(result.current.visible).toBe(true);
  });

  it("is hidden when capability denies holdings", () => {
    capabilityQuery.mockReturnValueOnce({
      data: {
        canViewHoldings: false,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    const { result } = renderHook(() => useCustomerDigitalMetalsVisible());
    expect(result.current.visible).toBe(false);
  });
});
