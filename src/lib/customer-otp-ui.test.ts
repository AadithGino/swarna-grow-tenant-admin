import { describe, expect, it } from "vitest";
import {
  customerOtpIncompleteMessage,
  customerOtpLengthFromTenant,
  customerOtpPattern,
} from "./customer-otp-ui";

describe("customer otp ui", () => {
  it("uses tenant otp length within 4–8", () => {
    expect(customerOtpLengthFromTenant({ otpLength: 4 })).toBe(4);
    expect(customerOtpPattern(4).test("1234")).toBe(true);
    expect(customerOtpPattern(4).test("123456")).toBe(false);
    expect(customerOtpIncompleteMessage(4)).toContain("4-digit");
  });
});
