import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

type Preview = Record<string, unknown>;
const state: {
  profileId: string | undefined;
  branches: { id: string; name: string; preview: Preview }[];
  create: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
} = { profileId: "cust_1", branches: [], create: vi.fn(), refetch: vi.fn() };
const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/src/components/customer/customer-tenant-context", () => ({ useCustomerTenant: () => ({ tenantSlug: "kairali" }) }));
vi.mock("@/src/lib/api-error", () => ({
  apiErrorCode: (e: { code?: string }) => e?.code,
  parseApiError: (e: { code?: string; status?: unknown }) => ({ code: e?.code, httpStatus: e?.status }),
  toastApiError: vi.fn(),
}));
vi.mock("@/src/store/api/customer-api", () => ({
  useListShopBookingAvailabilityQuery: () => ({ data: { branches: state.branches }, refetch: state.refetch }),
  useGetCustomerProfileQuery: () => ({ data: state.profileId ? { id: state.profileId, branch: { id: "home" } } : undefined }),
  useCreateShopBookingMutation: () => [(arg: unknown) => ({ unwrap: () => state.create(arg) }), { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BookWithAdvance } from "@/src/features/customer/customer-shop-booking-start";

const preview = (advanceRequiredPaise: number, ratePerGramPaise = 600_000): Preview => ({
  policyVersionId: "epolv_1", estimateTotalPaise: advanceRequiredPaise * 4, ratePerGramPaise, advanceRequiredPaise,
  advanceWindowMinutes: 30, balanceWindowHours: 72, rateRule: "BILLING_DAY", cancellationFeeBps: 1000,
  termsText: "Terms.", heldByOthers: false,
});

async function openAndAccept() {
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Book and continue/ }));
}

beforeEach(() => {
  cleanup();
  push.mockReset();
  window.localStorage.clear();
  state.profileId = "cust_1";
  state.refetch = vi.fn();
  state.create = vi.fn();
  state.branches = [{ id: "b2", name: "MG Road", preview: preview(1_699_500) }];
});

describe("BookWithAdvance", () => {
  it("offers a bookable branch even when the customer's own branch is not one", () => {
    state.branches = [{ id: "b2", name: "MG Road", preview: preview(1_699_500) }];
    render(<BookWithAdvance productId="p1" />);
    expect(screen.getByRole("button", { name: "Book" })).toBeEnabled();
  });

  it("shows nothing when no branch can take the booking", () => {
    state.branches = [];
    render(<BookWithAdvance productId="p1" />);
    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
  });

  it("sends the accepted advance and reuses one key when a lost response is retried", async () => {
    state.create = vi.fn()
      .mockRejectedValueOnce({ status: "FETCH_ERROR" })
      .mockResolvedValueOnce({ id: "bkg_1" });
    render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Book and continue/ }));
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
    const [a, b] = state.create.mock.calls.map((c) => c[0] as { idempotencyKey: string; acceptedAdvancePaise: number; acceptedEstimateTotalPaise: number; acceptedRatePerGramPaise: number });
    expect(a.acceptedAdvancePaise).toBe(1_699_500);
    expect(a.acceptedEstimateTotalPaise).toBe(1_699_500 * 4);
    expect(a.acceptedRatePerGramPaise).toBe(600_000);
    expect(b.idempotencyKey).toBe(a.idempotencyKey);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customer/kairali/shop/booking/bkg_1"));
  });

  it("when the price moved, holds nothing, shows the new quote and needs confirming again", async () => {
    state.create = vi.fn().mockRejectedValueOnce({ code: "BOOKING_QUOTE_CHANGED", status: 409 }).mockResolvedValueOnce({ id: "bkg_2" });
    const { rerender } = render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.refetch).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(/price or terms changed/i);

    // The refreshed quote arrives: the earlier agreement no longer applies, and the key is new.
    state.branches = [{ id: "b2", name: "MG Road", preview: preview(1_982_750) }];
    rerender(<BookWithAdvance productId="p1" />);
    const confirm = screen.getByRole("button", { name: /Book and continue/ });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(confirm);
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
    const [first, second] = state.create.mock.calls.map((c) => c[0] as { idempotencyKey: string; acceptedAdvancePaise: number });
    expect(second.acceptedAdvancePaise).toBe(1_982_750);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("after a refresh, replays the same request with the same key instead of making a second booking", async () => {
    state.create = vi.fn()
      .mockRejectedValueOnce({ status: "FETCH_ERROR" }) // the response was lost
      .mockResolvedValueOnce({ id: "bkg_9" });          // after the refresh the server returns the booking it already made
    const first = render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    const sent = state.create.mock.calls[0][0] as { idempotencyKey: string };
    expect(push).not.toHaveBeenCalled();

    first.unmount(); // refresh: all in-memory state is gone
    render(<BookWithAdvance productId="p1" />);
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
    const replay = state.create.mock.calls[1][0] as { idempotencyKey: string; acceptedAdvancePaise: number };
    expect(replay.idempotencyKey).toBe(sent.idempotencyKey);
    expect(replay.acceptedAdvancePaise).toBe(1_699_500);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customer/kairali/shop/booking/bkg_9"));
    expect(window.localStorage.length).toBe(0);
  });

  it("explains how long the rate is protected and what applies afterwards", () => {
    state.branches = [{ id: "b2", name: "MG Road", preview: { ...preview(1_699_500), rateRule: "BOOKED_RATE", rateProtectionHours: 24, balanceWindowHours: 72 } }];
    render(<BookWithAdvance productId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(screen.getByText(/held for 1 day after you pay the advance/)).toBeInTheDocument();
    expect(screen.getByText(/billed after that/)).toBeInTheDocument();
    expect(screen.queryByText(/locked/)).toBeNull();
  });

  it("when the gold rate moved but the advance did not, the old agreement no longer applies", () => {
    const { rerender } = render(<BookWithAdvance productId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Book and continue/ })).toBeEnabled();
    state.branches = [{ id: "b2", name: "MG Road", preview: preview(1_699_500, 650_000) }]; // same advance, higher rate
    rerender(<BookWithAdvance productId="p1" />);
    expect(screen.getByRole("button", { name: /Book and continue/ })).toBeDisabled();
  });

  it("keeps the original key when the server says the first request is still being processed", async () => {
    state.create = vi.fn()
      .mockRejectedValueOnce({ status: "FETCH_ERROR" })
      .mockRejectedValueOnce({ code: "REQUEST_IN_PROGRESS", status: 409 })
      .mockResolvedValueOnce({ id: "bkg_5" });
    render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Book and continue/ }));
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(1); // the saved request is still there: its outcome is not known
    fireEvent.click(screen.getByRole("button", { name: /Book and continue/ }));
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(3));
    const keys = state.create.mock.calls.map((c) => (c[0] as { idempotencyKey: string }).idempotencyKey);
    expect(new Set(keys).size).toBe(1);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customer/kairali/shop/booking/bkg_5"));
  });

  it("does not replay one customer's saved request for the next customer on the same browser", async () => {
    state.create = vi.fn().mockRejectedValueOnce({ status: "FETCH_ERROR" });
    const first = render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    first.unmount();

    state.profileId = "cust_2"; // someone else signs in on this browser
    state.create = vi.fn().mockResolvedValue({ id: "should-not-happen" });
    render(<BookWithAdvance productId="p1" />);
    await new Promise((r) => setTimeout(r, 30));
    expect(state.create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // And their own booking, once they confirm it, uses a key of its own.
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Book and continue/ }));
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  });

  it("waits for the customer's identity before replaying or submitting anything", async () => {
    state.create = vi.fn().mockRejectedValueOnce({ status: "FETCH_ERROR" });
    const first = render(<BookWithAdvance productId="p1" />);
    await openAndAccept();
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    first.unmount();

    state.profileId = undefined; // profile has not loaded yet
    state.create = vi.fn().mockResolvedValue({ id: "bkg_7" });
    const { rerender } = render(<BookWithAdvance productId="p1" />);
    await new Promise((r) => setTimeout(r, 30));
    expect(state.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Book and continue/ })).toBeDisabled();

    state.profileId = "cust_1"; // identity arrives, so the same customer's request is finished
    rerender(<BookWithAdvance productId="p1" />);
    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/customer/kairali/shop/booking/bkg_7"));
  });
});
