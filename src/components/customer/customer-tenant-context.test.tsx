import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { CustomerTenantProvider, useCustomerTenant } from "./customer-tenant-context";

vi.mock("@/src/store/api/customer-api", () => ({
  useResolveTenantQuery: () => ({
    data: {
      tenants: [
        {
          tenantCode: "DEMO",
          displayName: "Demo",
          otpLength: 4,
          authCountryCode: "91",
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("CustomerTenantProvider", () => {
  it("exposes otpLength and authCountryCode on tenant context", () => {
    const { result } = renderHook(() => useCustomerTenant(), {
      wrapper: ({ children }) => (
        <CustomerTenantProvider tenantSlug="demo">{children}</CustomerTenantProvider>
      ),
    });
    expect(result.current.tenant?.otpLength).toBe(4);
    expect(result.current.tenant?.authCountryCode).toBe("91");
  });
});
