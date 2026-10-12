import { describe, expect, it } from "vitest";
import { isPortalInternalPath, samePortalRealm } from "@/src/lib/portal-nav";

describe("portal-nav", () => {
  it("recognizes tenant admin and customer paths", () => {
    expect(isPortalInternalPath("/customers")).toBe(true);
    expect(isPortalInternalPath("/customer/kairali/schemes")).toBe(true);
    expect(isPortalInternalPath("/agent/collect")).toBe(true);
    expect(isPortalInternalPath("/marketing-landing")).toBe(false);
  });

  it("includes ecommerce admin paths", () => {
    expect(isPortalInternalPath("/ecommerce/orders")).toBe(true);
    expect(isPortalInternalPath("/reports")).toBe(true);
  });

  it("requires matching customer tenant slug", () => {
    expect(
      samePortalRealm("/customer/kairali/schemes/1", "/customer/kairali/plans"),
    ).toBe(true);
    expect(
      samePortalRealm("/customer/kairali/schemes/1", "/customer/other/plans"),
    ).toBe(false);
  });
});
