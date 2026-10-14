import { describe, expect, it, vi } from "vitest";
import {
  MAX_SCHEDULE_TIMEOUT_MS,
  createScheduleClock,
  customerBannerPollingIntervalMs,
  customerBannerQueryOptions,
  nextBannerScheduleBoundaryMs,
  scheduleDelayMs,
  scheduleRefetchAtBoundary,
} from "@/src/lib/customer-banner-refresh";

describe("customer-banner-refresh", () => {
  it("finds the next schedule boundary in the future", () => {
    const now = Date.parse("2026-01-01T12:00:00.000Z");
    const items = [{ endsAt: "2026-01-01T12:30:00.000Z" }];
    expect(nextBannerScheduleBoundaryMs(items, now)).toBe(
      Date.parse("2026-01-01T12:30:00.000Z"),
    );
  });

  it("caps polling interval between min and max", () => {
    expect(customerBannerPollingIntervalMs([])).toBe(120_000);
    const soon = [{ endsAt: new Date(Date.now() + 5_000).toISOString() }];
    expect(customerBannerPollingIntervalMs(soon)).toBeGreaterThanOrEqual(30_000);
  });

  it("uses response meta for polling when visible items are empty", () => {
    const opts = customerBannerQueryOptions([], {
      nextVisibilityChangeAt: new Date(Date.now() + 45_000).toISOString(),
    });
    expect(opts.pollingInterval).toBeLessThan(120_000);
    expect(opts.pollingInterval).toBeGreaterThanOrEqual(30_000);
    expect(opts.refetchOnFocus).toBe(true);
  });

  it("advances server clock by elapsed time since receipt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const clock = createScheduleClock(
      { serverTime: "2026-01-01T11:59:00.000Z" },
      Date.parse("2026-01-01T12:00:00.000Z"),
    );
    expect(clock()).toBe(Date.parse("2026-01-01T11:59:00.000Z"));
    vi.advanceTimersByTime(60_000);
    expect(clock()).toBe(Date.parse("2026-01-01T12:00:00.000Z"));
    vi.useRealTimers();
  });

  it("chains timeouts for boundaries beyond max delay", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const boundary = MAX_SCHEDULE_TIMEOUT_MS + 5_000;
    const refetch = vi.fn();
    const clock = () => Date.now();
    scheduleRefetchAtBoundary(boundary, refetch, clock);
    vi.advanceTimersByTime(MAX_SCHEDULE_TIMEOUT_MS);
    expect(refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_500);
    expect(refetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancel stops chained refetch schedule", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const boundary = MAX_SCHEDULE_TIMEOUT_MS + 5_000;
    const refetch = vi.fn();
    const clock = () => Date.now();
    const cancel = scheduleRefetchAtBoundary(boundary, refetch, clock);
    cancel();
    vi.advanceTimersByTime(MAX_SCHEDULE_TIMEOUT_MS + 10_000);
    expect(refetch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("scheduleDelayMs uses clock not wall Date.now", () => {
    const boundary = 1_000_000;
    const clock = () => 500_000;
    expect(scheduleDelayMs(boundary, clock)).toBe(500_250);
  });
});
