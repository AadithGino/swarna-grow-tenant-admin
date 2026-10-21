import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerDigitalMetalsDocumentPage } from "@/src/features/customer/customer-digital-metals-document-page";

vi.mock("@/src/components/customer/customer-tenant-context", () => ({
  useCustomerTenant: () => ({ tenantSlug: "testco" }),
}));

vi.mock("@/src/store/api/customer-api", () => ({
  useGetCustomerDigitalMetalsDocumentQuery: () => ({
    isLoading: false,
    isError: false,
    data: {
      id: "dmdoc_mock_1",
      status: "READY",
      docType: "METAL_STATEMENT",
      documentNumber: "STMT-2026-0001",
    },
    refetch: vi.fn(),
  }),
  useGetCustomerDigitalMetalsDocumentDownloadUrlMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("CustomerDigitalMetalsDocumentPage", () => {
  it("renders document shell for deep-link landing", () => {
    render(<CustomerDigitalMetalsDocumentPage artifactId="dmdoc_mock_1" />);
    expect(screen.getByTestId("customer-digital-metals-document-page")).toBeTruthy();
    expect(screen.getByTestId("digital-metals-document-panel").textContent).toContain("READY");
  });
});
