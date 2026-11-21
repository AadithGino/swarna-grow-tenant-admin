import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveShopPaymentAttemptId } from "@/src/lib/shop-payment-idempotency";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

const state: { booking: Record<string, unknown>; createIntent: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; poll: ReturnType<typeof vi.fn> } = {
  booking: {},
  poll: vi.fn(),
  createIntent: vi.fn(),
  cancel: vi.fn(),
};
const push = vi.fn();
const openTarget = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/src/components/customer/customer-tenant-context", () => ({ useCustomerTenant: () => ({ tenantSlug: "kairali" }) }));
vi.mock("@/src/lib/customer-payment-redirect", () => ({
  pickPhonePeGatewayUrl: () => "https://gateway.test/pay",
  openCustomerPaymentTarget: (...args: unknown[]) => openTarget(...args),
}));
vi.mock("@/src/store/api/customer-api", () => ({
  useGetShopBookingQuery: () => ({ data: state.booking, isLoading: false, isError: false, refetch: vi.fn() }),
  useGetShopFulfilmentOptionsQuery: () => ({ data: { pickup: { enabled: true, branches: [{ id: "br1", name: "MG Road" }] } } }),
  useCreateShopBookingPaymentIntentMutation: () => [(arg: unknown) => ({ unwrap: () => state.createIntent(arg) }), { isLoading: false }],
  useCancelShopBookingMutation: () => [(arg: unknown) => ({ unwrap: () => state.cancel(arg) }), { isLoading: false }],
  useLazyPollShopBookingPaymentIntentQuery: () => [() => ({ unwrap: () => state.poll() })],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CustomerShopBookingPage } from "@/src/features/customer/customer-shop-booking-page";

const base = {
  id: "bkg_1", bookingNumber: "BK-0001", product: { name: "Gold Ring" }, pickupBranchId: "br1",
  estimateTotalPaise: 100_000, advance: { requiredPaise: 25_000, capturedPaise: 0 }, balance: {}, refundStatus: "NONE",
  policy: { cancellationFeeBps: 1000, termsText: "Be kind." }, refunds: [],
};

beforeEach(() => {
  cleanup();
  push.mockReset();
  openTarget.mockReset();
  state.createIntent = vi.fn().mockResolvedValue({ paymentIntent: { id: "epay_1", status: "INITIATED" } });
  state.cancel = vi.fn().mockResolvedValue({});
  state.poll = vi.fn().mockRejectedValue(new Error("no attempt"));
  window.sessionStorage.clear();
});

describe("customer booking page", () => {
  it("asks for the advance and starts the payment with the booking page as the return address", async () => {
    state.booking = { ...base, status: "PENDING_ADVANCE", advanceDueAt: new Date(Date.now() + 1_800_000).toISOString() };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText("Gold Ring")).toBeInTheDocument();
    expect(screen.getByText("Advance due")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Pay advance/ });
    fireEvent.click(button);
    await waitFor(() => expect(state.createIntent).toHaveBeenCalledTimes(1));
    const arg = state.createIntent.mock.calls[0][0] as { bookingId: string; redirectUrl: string; idempotencyKey: string };
    expect(arg.bookingId).toBe("bkg_1");
    expect(arg.redirectUrl).toMatch(/\/customer\/kairali\/shop\/booking\/bkg_1$/);
    expect(arg.idempotencyKey.length).toBeGreaterThan(8);
    await waitFor(() => expect(openTarget).toHaveBeenCalled());
  });

  it("asks for the balance once the store has billed", () => {
    state.booking = {
      ...base, status: "BALANCE_PENDING", advance: { requiredPaise: 25_000, capturedPaise: 25_000 },
      balance: { requiredPaise: 70_000 }, finalBilling: { totalPaise: 95_000, balancePaise: 70_000 },
      balanceDueAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByRole("button", { name: /Pay balance/ })).toBeInTheDocument();
    expect(screen.getByText(/Pay the balance to complete your purchase/)).toBeInTheDocument();
  });

  it("shows a reserved piece with no payment button while waiting for the store to bill", () => {
    state.booking = { ...base, status: "CONFIRMED", advance: { requiredPaise: 25_000, capturedPaise: 25_000 } };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText("Your piece is reserved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pay (advance|balance)/ })).toBeNull();
  });

  it("previews the fee and refund before cancelling, then cancels", async () => {
    state.booking = { ...base, status: "CONFIRMED", advance: { requiredPaise: 25_000, capturedPaise: 25_000 } };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
    expect(await screen.findByText("Cancellation fee kept")).toBeInTheDocument();
    expect(screen.getByText("Refund to you")).toBeInTheDocument();
    expect(screen.getByText("₹225.00")).toBeInTheDocument();
    const confirm = screen.getAllByRole("button", { name: "Cancel booking" }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(state.cancel).toHaveBeenCalledWith({ bookingId: "bkg_1", reason: undefined }));
  });

  it("tells a cancelled customer their refund is on the way, without provider detail", () => {
    state.booking = {
      ...base, status: "CANCELLED", refundStatus: "PENDING", cancellationFeePaise: 2_500,
      advance: { requiredPaise: 25_000, capturedPaise: 25_000 },
      refunds: [{ id: "r1", amountPaise: 22_500, status: "INITIATED" }],
    };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText(/Refund on the way/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pay (advance|balance)/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
    expect(screen.queryByText(/PhonePe|provider|rejected/i)).toBeNull();
  });

  it("links a converted booking to its order", () => {
    state.booking = { ...base, status: "CONVERTED", order: { id: "ord_9", orderNumber: "ORD-9" } };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText(/Order ORD-9 is placed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order" })).toHaveAttribute("href", "/customer/kairali/shop/order/ord_9");
  });

  const billed = {
    ...base, status: "BALANCE_PENDING", advance: { requiredPaise: 25_000, capturedPaise: 25_000 },
    balance: { requiredPaise: 70_000 }, finalBilling: { totalPaise: 95_000, balancePaise: 70_000 },
    balanceDueAt: new Date(Date.now() + 86_400_000).toISOString(),
  };

  it("keeps Pay balance enabled when the only saved attempt is the paid advance", async () => {
    state.booking = billed;
    // Whatever was saved for this booking, the poll hands back the advance attempt, which is SUCCEEDED.
    saveShopPaymentAttemptId("bkg_1:BALANCE", "epay_advance");
    saveShopPaymentAttemptId("bkg_1", "epay_advance");
    state.poll = vi.fn().mockResolvedValue({ paymentIntent: { id: "epay_advance", purpose: "BOOKING_ADVANCE", status: "SUCCEEDED" } });
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    await waitFor(() => expect(state.poll).toHaveBeenCalled());
    const button = screen.getByRole("button", { name: /Pay balance/ });
    expect(button).toBeEnabled();
    expect(screen.queryByText(/Payment received/)).toBeNull();
  });

  it("does disable Pay balance while the balance payment itself has succeeded and is being confirmed", async () => {
    state.booking = billed;
    saveShopPaymentAttemptId("bkg_1:BALANCE", "epay_balance");
    state.poll = vi.fn().mockResolvedValue({ paymentIntent: { id: "epay_balance", purpose: "BOOKING_BALANCE", status: "SUCCEEDED" } });
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(await screen.findByText(/Payment received/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay balance/ })).toBeDisabled();
  });

  it("offers to resume an in-progress balance payment", async () => {
    state.booking = billed;
    saveShopPaymentAttemptId("bkg_1:BALANCE", "epay_balance");
    state.poll = vi.fn().mockResolvedValue({ paymentIntent: { id: "epay_balance", purpose: "BOOKING_BALANCE", status: "INITIATED" } });
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(await screen.findByRole("button", { name: "Resume payment" })).toBeEnabled();
  });

  it("says excess advance will be refunded until the refund is sent", () => {
    state.booking = { ...billed, status: "CONVERTED", order: { id: "o1" }, finalBilling: { totalPaise: 20_000, balancePaise: 0, excessAdvancePaise: 5_000 }, refundStatus: "PENDING" };
    const { unmount } = render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText("Advance above final price (will be refunded)")).toBeInTheDocument();
    unmount();
    state.booking = { ...state.booking, refundStatus: "SETTLED" };
    render(<CustomerShopBookingPage bookingId="bkg_1" />);
    expect(screen.getByText("Advance above final price (refunded)")).toBeInTheDocument();
  });
});
