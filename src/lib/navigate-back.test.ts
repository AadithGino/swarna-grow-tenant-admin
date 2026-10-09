import { describe, expect, it, vi, beforeEach } from "vitest";
import { canNavigateBackInPortal, navigateBack } from "@/src/lib/navigate-back";

describe("navigateBack", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("window", {
      history: { length: 1, state: { idx: 0 } },
      location: { pathname: "/" },
    });
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  it("uses fallback when history index is zero", () => {
    const push = vi.fn();
    const back = vi.fn();
    (window as { history: { length: number; state: { idx: number } } }).history = {
      length: 2,
      state: { idx: 0 },
    };
    navigateBack({ push, back } as never, "/customers");
    expect(push).toHaveBeenCalledWith("/customers");
    expect(back).not.toHaveBeenCalled();
  });

  it("uses browser back when prior path is in the same portal realm", () => {
    sessionStorage.setItem("sg.portal.previousPath", "/customers");
    (window as { location: { pathname: string } }).location = { pathname: "/customers/cus_1" };
    (window as { history: { length: number; state: { idx: number } } }).history = {
      length: 3,
      state: { idx: 2 },
    };
    const push = vi.fn();
    const back = vi.fn();
    navigateBack({ push, back } as never, "/customers");
    expect(back).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("uses fallback when prior path is outside the portal", () => {
    sessionStorage.setItem("sg.portal.previousPath", "/not-a-portal-route");
    (window as { location: { pathname: string } }).location = { pathname: "/enrollments/enr_1" };
    (window as { history: { length: number; state: { idx: number } } }).history = {
      length: 3,
      state: { idx: 2 },
    };
    const push = vi.fn();
    const back = vi.fn();
    navigateBack({ push, back } as never, "/enrollments");
    expect(push).toHaveBeenCalledWith("/enrollments");
  });
});

describe("canNavigateBackInPortal", () => {
  it("is false without in-portal previous path", () => {
    expect(canNavigateBackInPortal()).toBe(false);
  });
});
