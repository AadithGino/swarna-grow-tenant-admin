import { describe, expect, it } from "vitest";
import { normalizeCustomerTenantBranding, normalizeCustomerTenantResolve } from "@/src/lib/customer-tenant-branding";

describe("normalizeCustomerTenantBranding", () => {
  it("flattens nested branding colours", () => {
    const row = normalizeCustomerTenantBranding({
      tenantCode: "KAI",
      branding: { primaryColor: "#112233", accentColor: "#AABBCC" },
    });
    expect(row?.primaryColor).toBe("#112233");
    expect(row?.accentColor).toBe("#AABBCC");
  });

  it("prefers top-level colours when present", () => {
    const row = normalizeCustomerTenantBranding({
      tenantCode: "KAI",
      primaryColor: "#010101",
      accentColor: "#020202",
      branding: { primaryColor: "#999999" },
    });
    expect(row?.primaryColor).toBe("#010101");
  });

  it("maps secondaryColor to accent", () => {
    const row = normalizeCustomerTenantBranding({
      branding: { secondaryColor: "#CCAA00" },
    });
    expect(row?.accentColor).toBe("#CCAA00");
  });
});

describe("normalizeCustomerTenantResolve", () => {
  it("normalizes all tenants in resolve payload", () => {
    const out = normalizeCustomerTenantResolve({
      resolvedBy: "TENANT_CODE",
      tenants: [{ branding: { primaryColor: "#ABCDEF" } }],
    });
    expect(out.tenants[0]?.primaryColor).toBe("#ABCDEF");
  });
});
