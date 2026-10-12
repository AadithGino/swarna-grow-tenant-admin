import type { EcommerceOrdersListFiltersState, EcommerceOrdersListView } from "./ecommerce-orders-list-filters";

const VIEWS = new Set<EcommerceOrdersListView>([
  "all",
  "needs_action",
  "cod_acceptance",
  "to_fulfil",
  "payment_issues",
  "returns_cancel",
]);

export function parseOrdersListFiltersFromSearchParams(
  params: URLSearchParams,
): EcommerceOrdersListFiltersState {
  const viewRaw = params.get("view") ?? "all";
  const view = VIEWS.has(viewRaw as EcommerceOrdersListView)
    ? (viewRaw as EcommerceOrdersListView)
    : "all";
  return {
    view,
    q: params.get("q") ?? "",
    status: params.get("status") ?? "ALL",
    paymentMethod: params.get("payment") ?? "ALL",
    createdFrom: params.get("from") ?? "",
    createdTo: params.get("to") ?? "",
    period: params.get("period") ?? "THIS_MONTH",
  };
}

export function ordersListFiltersToSearchParams(
  filters: EcommerceOrdersListFiltersState,
  cursor?: string,
): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.view !== "all") p.set("view", filters.view);
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.status !== "ALL") p.set("status", filters.status);
  if (filters.paymentMethod !== "ALL") p.set("payment", filters.paymentMethod);
  if (filters.createdFrom.trim()) p.set("from", filters.createdFrom.trim());
  if (filters.createdTo.trim()) p.set("to", filters.createdTo.trim());
  else if (filters.period && filters.period !== "THIS_MONTH") p.set("period", filters.period);
  if (cursor) p.set("cursor", cursor);
  return p;
}

export function ordersListBackHref(filters: EcommerceOrdersListFiltersState, cursor?: string) {
  const q = ordersListFiltersToSearchParams(filters, cursor);
  const s = q.toString();
  return s ? `/ecommerce/orders?${s}` : "/ecommerce/orders";
}
