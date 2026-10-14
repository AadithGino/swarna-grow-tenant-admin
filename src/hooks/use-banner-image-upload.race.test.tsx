/* @vitest-environment happy-dom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBannerImageUpload } from "@/src/hooks/use-banner-image-upload";

function jpeg(name: string) {
  return new File([new Uint8Array(100)], name, { type: "image/jpeg" });
}

describe("useBannerImageUpload races", () => {
  it("retains B when A completes last", async () => {
    let resolveA: (id: string) => void = () => {};
    const upload = vi.fn((file: File) => {
      if (file.name === "a.jpg") {
        return new Promise<string>((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve("id-b");
    });
    const { result } = renderHook(() => useBannerImageUpload({ upload }));
    act(() => result.current.reset(null));
    await act(async () => {
      void result.current.pickFile(jpeg("a.jpg"));
    });
    await act(async () => {
      await result.current.pickFile(jpeg("b.jpg"));
    });
    expect(result.current.imageUploadId).toBe("id-b");
    await act(async () => {
      resolveA("id-a");
    });
    expect(result.current.imageUploadId).toBe("id-b");
  });

  it("reset between banners ignores late completion from prior session", async () => {
    let resolveSlow: (id: string) => void = () => {};
    const upload = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveSlow = resolve;
        }),
    );
    const { result } = renderHook(() => useBannerImageUpload({ upload }));
    act(() => result.current.reset("banner-a-image"));
    await act(async () => {
      void result.current.pickFile(jpeg("slow.jpg"));
    });
    act(() => result.current.reset("banner-b-image"));
    await act(async () => {
      resolveSlow("stale");
    });
    await waitFor(() => expect(result.current.uploading).toBe(false));
    expect(result.current.imageUploadId).toBe("banner-b-image");
  });

  it("failed replacement keeps prior image", async () => {
    const upload = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useBannerImageUpload({ upload }));
    act(() => result.current.reset("original"));
    await act(async () => {
      await result.current.pickFile(jpeg("new.jpg"));
    });
    expect(result.current.imageUploadId).toBe("original");
  });

  it("unmount invalidates pending upload callbacks", async () => {
    let resolve: (id: string) => void = () => {};
    const upload = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    const { result, unmount } = renderHook(() => useBannerImageUpload({ upload }));
    act(() => result.current.reset("keep"));
    await act(async () => {
      void result.current.pickFile(jpeg("x.jpg"));
    });
    unmount();
    resolve("late");
  });
});
