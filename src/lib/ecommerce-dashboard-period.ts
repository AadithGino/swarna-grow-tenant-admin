/** Map dashboard period args to ecommerce summary / report query params. */
export function ecommerceInsightsQueryFromDashboard(input: {
  period?: string;
  from?: string;
  to?: string;
}): { period?: string; from?: string; to?: string } {
  if (input.from && input.to) {
    return { from: input.from, to: input.to };
  }
  return { period: input.period ?? "THIS_MONTH" };
}

export function ecommerceOrdersListHref(view: string, periodQuery: ReturnType<typeof ecommerceInsightsQueryFromDashboard>) {
  const p = new URLSearchParams();
  p.set("view", view);
  if (periodQuery.from && periodQuery.to) {
    p.set("from", periodQuery.from);
    p.set("to", periodQuery.to);
  } else if (periodQuery.period) {
    p.set("period", periodQuery.period);
  }
  return `/ecommerce/orders?${p.toString()}`;
}
