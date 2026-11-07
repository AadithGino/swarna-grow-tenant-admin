import { describe, expect, it } from "vitest";
import { deriveCustomerAuthOtpFormState } from "./customer-auth-page";

describe("customer auth OTP form (AUD-09)", () => {
  const baseTenant = { otpLength: 6, authCountryCode: "91" };

  it("uses request otpLength 4 / 6 / 8 over tenant default", () => {
    expect(deriveCustomerAuthOtpFormState(baseTenant, { otpLength: 4 }).otpLength).toBe(4);
    expect(deriveCustomerAuthOtpFormState(baseTenant, { otpLength: 8 }).otpLength).toBe(8);
    expect(deriveCustomerAuthOtpFormState(baseTenant, null).otpLength).toBe(6);
  });

  it("prefers request authCountryCode for region label (e.g. 971)", () => {
    const r = deriveCustomerAuthOtpFormState(baseTenant, { authCountryCode: "971" });
    expect(r.smsRegion).toContain("+971");
  });

  it("keeps India label for default +91", () => {
    expect(deriveCustomerAuthOtpFormState(baseTenant, null).smsRegion).toBe("India");
  });
});
