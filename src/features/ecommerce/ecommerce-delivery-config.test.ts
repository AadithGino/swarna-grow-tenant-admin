import { describe, expect, it } from "vitest";
import {
  deliveryConfigIssues,
  isDeliveryConfigured,
  parseServiceablePincodes,
} from "./ecommerce-delivery-config";

describe("ecommerce-delivery-config", () => {
  it("parses valid pincodes only", () => {
    expect(parseServiceablePincodes("686691\n682001")).toEqual(["686691", "682001"]);
    expect(parseServiceablePincodes("12345")).toEqual([]);
  });

  it("requires charge and pincodes like the API", () => {
    expect(isDeliveryConfigured("686691", 0)).toBe(true);
    expect(isDeliveryConfigured("686691", null)).toBe(false);
    expect(isDeliveryConfigured("", 5000)).toBe(false);
  });

  it("lists issues when charge missing", () => {
    const issues = deliveryConfigIssues("686691", "", null);
    expect(issues.some((i) => i.includes("0 for free"))).toBe(true);
  });
});
