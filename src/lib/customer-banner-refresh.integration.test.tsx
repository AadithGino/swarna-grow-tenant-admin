/* @vitest-environment happy-dom */
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  customerBannerQueryOptions,
  effectiveNowMs,
  useCustomerBannerScheduleRefetch,
} from "@/src/lib/customer-banner-refresh";

describe("customer banner refresh integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules refetch from empty list + future meta boundary", () => {
    const refetch = vi.fn();
    renderHook(() =>
      useCustomerBannerScheduleRefetch(
        [],
        refetch,
        { nextVisibilityChangeAt: "2026-01-01T12:00:05.000Z", serverTime: "2026-01-01T12:00:00.000Z" },
      ),
    );
    act(() => {
      vi.advanceTimersByTime(5250);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when hook disabled (skipped query)", () => {
    const refetch = vi.fn();
    renderHook(() =>
      useCustomerBannerScheduleRefetch([], refetch, null, { enabled: false }),
    );
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("uses serverTime for skew-aware polling interval", () => {
    const opts = customerBannerQueryOptions([], {
      nextVisibilityChangeAt: "2026-01-01T12:01:00.000Z",
      serverTime: "2026-01-01T12:00:30.000Z",
    });
    expect(opts.pollingInterval).toBeLessThan(120_000);
    expect(effectiveNowMs({ serverTime: "2026-01-01T12:00:30.000Z" })).toBe(
      Date.parse("2026-01-01T12:00:30.000Z"),
    );
  });

  it("cleans up timer on unmount", () => {
    const refetch = vi.fn();
    const { unmount } = renderHook(() =>
      useCustomerBannerScheduleRefetch(
        [],
        refetch,
        { nextVisibilityChangeAt: "2026-01-01T12:05:00.000Z" },
      ),
    );
    unmount();
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not restart countdown on rerender with same boundary key", () => {
    const refetch = vi.fn();
    const meta = {
      nextVisibilityChangeAt: "2026-01-01T12:00:10.000Z",
      serverTime: "2026-01-01T12:00:00.000Z",
    };
    const { rerender } = renderHook(() =>
      useCustomerBannerScheduleRefetch([], refetch, meta),
    );
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    rerender();
    act(() => {
      vi.advanceTimersByTime(5_500);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("uses elapsed server time after cached meta without resetting to full delay", () => {
    const refetch = vi.fn();
    renderHook(() =>
      useCustomerBannerScheduleRefetch(
        [],
        refetch,
        {
          nextVisibilityChangeAt: "2026-01-01T12:00:08.000Z",
          serverTime: "2026-01-01T11:59:58.000Z",
        },
      ),
    );
    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
