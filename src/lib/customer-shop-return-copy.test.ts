import { describe, expect, it } from "vitest";
import { returnFlowCopy } from "@/src/lib/customer-shop-return-copy";

describe("returnFlowCopy", () => {
  it("offers a return only on scheme-funded orders and explains a replacement needs a new purchase", () => {
    const c = returnFlowCopy(true);
    expect(Object.values(c).join(" ")).not.toMatch(/return or exchange|Returns & exchanges|exchanges are/i);
    expect(c.button).toBe("Request return");
    expect(c.intro).toMatch(/new order/);
    expect(c.dialogNote).toMatch(/new purchase/);
  });
  it("keeps return-or-exchange wording for ordinary orders", () => {
    expect(returnFlowCopy(false).button).toBe("Request return or exchange");
  });
});
