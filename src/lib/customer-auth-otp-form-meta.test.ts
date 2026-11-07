import { describe, expect, it } from "vitest";
import {
  customerAuthOtpLengthFromContext,
  customerAuthOtpSmsRegionFromContext,
} from "./customer-auth-otp-form-meta";
import { customerOtpSmsRegionLabel } from "./customer-otp-ui";

describe("customerAuthOtp form meta", () => {
  it("uses request otpLength over tenant default (4 vs 6)", () => {
    const tenant = { tenantCode: "X", displayName: "X", appDisplayName: "X", otpLength: 6 } as const;
    expect(customerAuthOtpLengthFromContext(tenant, { otpLength: 4 })).toBe(4);
  });

  it("falls back to tenant otpLength when request has none", () => {
    const tenant = { tenantCode: "X", displayName: "X", appDisplayName: "X", otpLength: 8 } as const;
    expect(customerAuthOtpLengthFromContext(tenant, null)).toBe(8);
  });

  it("uses request authCountryCode for SMS label when present", () => {
    const tenant = { tenantCode: "X", displayName: "X", appDisplayName: "X", authCountryCode: "91" } as const;
    const label = customerOtpSmsRegionLabel(customerAuthOtpSmsRegionFromContext(tenant, { authCountryCode: "971" }));
    expect(label).toContain("+971");
  });
});
