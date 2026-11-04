import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CounterSellMetalDialog } from "./counter-sell-metal-dialog";

afterEach(cleanup);

const api = vi.hoisted(() => ({ quote: vi.fn(), sell: vi.fn(), pay: vi.fn() }));
vi.mock("@/src/store/api/admin-api", () => ({
  useCreateDigitalMetalsCounterSellQuoteMutation: () => [api.quote, {}],
  usePlaceDigitalMetalsCounterSellMutation: () => [api.sell, {}],
  useRecordDigitalMetalsSellCashPayoutMutation: () => [api.pay, {}],
  useGetDigitalMetalsCustomerBankDestinationsQuery: () => ({ data: { items: [{ id: "bank_1", status: "ACTIVE", accountLast4: "9012" }] } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.quote.mockReturnValue({ unwrap: async () => ({ quoteId: "quote_1", quantityUg: "1000000", settlementPaise: 50000, expiresAt: new Date(Date.now() + 900000).toISOString() }) });
  api.sell.mockReturnValue({ unwrap: async () => ({ order: { id: "sell_1", status: "PAYABLE_OPEN" } }) });
  api.pay.mockReturnValue({ unwrap: async () => ({ payable: { status: "SETTLED" } }) });
});

function mount() {
  render(<CounterSellMetalDialog open onOpenChange={vi.fn()} customerId="customer_1" customerName="Test User" rates={[]} holdings={[{ metal: "GOLD", finenessPpm: 999000, heldUg: "2000000", availableUg: "2000000", reservedUg: "0", sellRatePerGramPaise: 50000, valuePaise: 100000 }]} />);
}
async function price() {
  fireEvent.change(screen.getByLabelText("Weight in grams"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Get today's price/i }));
  await screen.findByRole("button", { name: "Confirm sale" });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("counter sale automatic acceptance", () => {
  it("accepts cash sale without approval, then records cash only on a separate click", async () => {
    mount();
    await price();
    fireEvent.click(screen.getByRole("button", { name: "Confirm sale" }));
    await screen.findByText("Sale accepted — payment pending");
    expect(api.sell).toHaveBeenCalledOnce();
    expect(api.pay).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Paid .* in cash/i }));
    await waitFor(() => expect(api.pay).toHaveBeenCalledOnce());
    expect(api.pay.mock.calls[0][0].orderId).toBe("sell_1");
    await screen.findByText(/paid in cash/i);
  });
  it("accepts bank sale and directs staff to record the external transfer", async () => {
    mount();
    await price();
    fireEvent.click(screen.getByRole("radio", { name: /Bank transfer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm sale" }));
    await screen.findByText("Sale accepted — payment pending");
    expect(api.sell.mock.calls[0][0]).toMatchObject({ payoutMethod: "BANK", bankDestinationId: "bank_1" });
    expect(screen.getByRole("link", { name: "sell order" }).getAttribute("href")).toBe("/digital-metals/sells/sell_1");
    expect(api.pay).not.toHaveBeenCalled();
  });
});
