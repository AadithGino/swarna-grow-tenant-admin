import { describe, expect, it } from "vitest";
import { uploadIdFromCatalogRef } from "@/src/lib/ecommerce-upload-id";

describe("uploadIdFromCatalogRef", () => {
  it("parses view paths and raw ids", () => {
    expect(uploadIdFromCatalogRef("/uploads/upl_abc123")).toBe("upl_abc123");
    expect(uploadIdFromCatalogRef("upl_raw")).toBe("upl_raw");
    expect(uploadIdFromCatalogRef(null)).toBeNull();
  });
});
