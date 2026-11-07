import { describe, expect, it } from "vitest";
import { buildRatesWorkspaceLinks } from "./rates-workspace-hub";

describe("buildRatesWorkspaceLinks", () => {
  it("always includes scheme rates", () => {
    const links = buildRatesWorkspaceLinks({
      showEcommerce: false,
      showDigitalMetals: false,
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe("/gold-rates");
  });

  it("adds optional domains only when entitled", () => {
    expect(
      buildRatesWorkspaceLinks({
        showEcommerce: true,
        showDigitalMetals: false,
      }).map((l) => l.href),
    ).toEqual(["/gold-rates", "/ecommerce/gold-rates"]);

    expect(
      buildRatesWorkspaceLinks({
        showEcommerce: false,
        showDigitalMetals: true,
      }).map((l) => l.href),
    ).toEqual(["/gold-rates", "/digital-metals/rates"]);

    expect(
      buildRatesWorkspaceLinks({
        showEcommerce: true,
        showDigitalMetals: true,
      }).map((l) => l.href),
    ).toEqual([
      "/gold-rates",
      "/ecommerce/gold-rates",
      "/digital-metals/rates",
    ]);
  });
});
