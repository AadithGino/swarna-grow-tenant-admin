/** RTK Query pollingInterval: 0 disables polling. */
export function customerPollIntervalMs(
  status: unknown,
  terminalStatuses: ReadonlySet<string>,
  activeIntervalMs: number,
): number {
  return terminalStatuses.has(String(status ?? "")) ? 0 : activeIntervalMs;
}

export const SHOP_ORDER_POLL_TERMINAL = new Set([
  "PAID",
  "CANCELLED",
  "PAYMENT_EXPIRED",
  "PAYMENT_FAILED",
  "DELIVERED",
  "COMPLETED",
  "REFUNDED",
]);

export const DM_BUY_ORDER_POLL_TERMINAL = new Set([
  "CREDITED",
  "REFUND_REVIEW",
  "REFUNDED",
  "EXPIRED",
]);

export const DM_REDEEM_ORDER_POLL_TERMINAL = new Set([
  "CHARGE_PAID",
  "FULFILLED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);

export const DM_SELL_ORDER_POLL_TERMINAL = new Set([
  "SETTLED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
]);
