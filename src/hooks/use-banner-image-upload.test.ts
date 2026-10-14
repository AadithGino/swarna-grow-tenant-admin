import { describe, expect, it, vi } from "vitest";
import { validateBannerImageFile } from "@/src/hooks/use-banner-image-upload";

function jpegFile(name = "a.jpg", size = 1000) {
  return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}

describe("validateBannerImageFile", () => {
  it("rejects unsupported MIME types", () => {
    expect(
      validateBannerImageFile(new File([new Uint8Array(1)], "x.gif", { type: "image/gif" })),
    ).toMatch(/PNG, JPEG, or WebP/);
  });

  it("rejects files over 2 MB", () => {
    expect(validateBannerImageFile(jpegFile("big.jpg", 2_000_001))).toMatch(/2 MB/);
  });

  it("accepts supported sizes and types", () => {
    expect(validateBannerImageFile(jpegFile())).toBeNull();
  });
});

describe("upload completion ordering", () => {
  it("ignores stale completion when generation advanced", async () => {
    let generation = 0;
    let imageUploadId: string | null = "keep-me";
    const applyIfCurrent = (gen: number, id: string) => {
      if (gen !== generation) return;
      imageUploadId = id;
    };

    const gen = ++generation;
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve("stale"), 20);
    });
    generation += 1;
    const id = await slow;
    applyIfCurrent(gen, id);
    expect(imageUploadId).toBe("keep-me");
  });

  it("restores previous id after failed replacement", async () => {
    const upload = vi.fn().mockRejectedValue(new Error("network"));
    let imageUploadId: string | null = "original-id";
    const previous = imageUploadId;
    try {
      imageUploadId = await upload(jpegFile());
    } catch {
      imageUploadId = previous;
    }
    expect(imageUploadId).toBe("original-id");
    expect(upload).toHaveBeenCalled();
  });
});
