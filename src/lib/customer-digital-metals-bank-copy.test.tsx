import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsBankPage } from "@/src/features/customer/customer-digital-metals-bank-pages";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "demo" }),
}));

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsBankDestinationsQuery: () => ({
    data: {
      items: [
        {
          id: "bd1",
          accountHolderName: "Test User",
          accountLast4: "1234",
          ifsc: "HDFC0001",
          bankName: "HDFC",
          status: "PENDING_VERIFICATION",
          verifiedAt: null,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateCustomerDigitalMetalsBankDestinationMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("customer bank verification copy", () => {
  afterEach(() => cleanup());

  it("describes manual jeweller verification", () => {
    render(<CustomerDigitalMetalsBankPage />);
    expect(screen.getByText(/manual verification/i)).toBeTruthy();
    expect(screen.queryByText(/automated bank verification/i)).toBeNull();
  });
});
