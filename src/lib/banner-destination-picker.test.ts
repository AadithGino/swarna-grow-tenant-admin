import { describe, expect, it } from "vitest";
import {
  resolveTargetLabel,
  withPinnedPickerOption,
} from "@/src/lib/banner-destination-picker";

describe("banner-destination-picker", () => {
  it("keeps pinned target name when off-page", () => {
    const options = withPinnedPickerOption([], "cat-99", { id: "cat-99", name: "Heritage" });
    expect(options[0].name).toBe("Heritage");
  });

  it("marks inactive loaded targets explicitly", () => {
    const label = resolveTargetLabel(
      "cat-1",
      [{ id: "cat-1", name: "Old", active: false }],
      null,
      "category",
    );
    expect(label?.state).toBe("inactive");
  });

  it("marks missing targets explicitly", () => {
    const label = resolveTargetLabel("missing", [], null, "product");
    expect(label?.state).toBe("missing");
  });

  it("marks non-published products as unavailable", () => {
    const label = resolveTargetLabel(
      "p-1",
      [{ id: "p-1", name: "Draft ring", status: "DRAFT" }],
      null,
      "product",
    );
    expect(label?.state).toBe("inactive");
    expect(label?.label).toMatch(/not published/i);
  });
});
