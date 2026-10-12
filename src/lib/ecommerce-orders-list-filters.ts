import type { EcommerceOrdersListQueryParams } from "./ecommerce-orders-list-filters.types";

export type {
  EcommerceOrdersListQueryParams,
} from "./ecommerce-orders-list-filters.types";

export type EcommerceOrdersListView =
  | "all"
  | "needs_action"
  | "cod_acceptance"
  | "to_fulfil"
  | "payment_issues"
  | "returns_cancel";

export const ECOMMERCE_ORDER_LIST_VIEWS: Array<{
  id: EcommerceOrdersListView;
  label: string;
  description: string;
}> = [
  { id: "all", label: "All", description: "Every order in the date range" },
  {
    id: "needs_action",
    label: "Needs action",
    description: "COD acceptance, unpaid online, or payment exceptions on this page",
  },
  {
    id: "cod_acceptance",
    label: "COD awaiting acceptance",
    description: "Server: codPendingAcceptance=true",
  },
  {
    id: "to_fulfil",
    label: "To fulfil",
    description: "Server: status=PAID (accepted, ready to process)",
  },
  {
    id: "payment_issues",
    label: "Payment issues",
    description: "Server: paymentException=true",
  },
  {
    id: "returns_cancel",
    label: "Returns & cancellations",
    description: "Server: returnPending=true",
  },
];

export const ECOMMERCE_ORDER_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Any status" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "COD_PENDING_ACCEPTANCE", label: "COD pending acceptance" },
  { value: "PAID", label: "Paid" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const ECOMMERCE_ORDER_PAYMENT_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All payments" },
  { value: "ONLINE", label: "Online" },
  { value: "COD", label: "Cash on delivery" },
];

export type EcommerceOrdersListFiltersState = {
  view: EcommerceOrdersListView;
  q: string;
  status: string;
  paymentMethod: string;
  createdFrom: string;
  createdTo: string;
  period: string;
};

export function emptyEcommerceOrdersListFilters(): EcommerceOrdersListFiltersState {
  return {
    view: "all",
    q: "",
    status: "ALL",
    paymentMethod: "ALL",
    createdFrom: "",
    createdTo: "",
    period: "THIS_MONTH",
  };
}

export function buildEcommerceOrdersListQuery(input: {
  view: EcommerceOrdersListView;
  q: string;
  status: string;
  paymentMethod: string;
  createdFrom: string;
  createdTo: string;
  period: string;
  limit?: number;
  cursor?: string;
}): EcommerceOrdersListQueryParams {
  const params: EcommerceOrdersListQueryParams = {
    limit: input.limit ?? 25,
  };
  if (input.cursor) params.cursor = input.cursor;
  const q = input.q.trim();
  if (q.length >= 2) params.q = q;
  if (input.status !== "ALL") params.status = input.status;
  if (input.paymentMethod !== "ALL") params.paymentMethod = input.paymentMethod;
  if (input.createdFrom.trim()) params.createdFrom = input.createdFrom.trim();
  else if (input.period && !input.createdTo.trim()) params.period = input.period;
  if (input.createdTo.trim()) params.createdTo = input.createdTo.trim();

  switch (input.view) {
    case "cod_acceptance":
      params.codPendingAcceptance = "true";
      break;
    case "to_fulfil":
      params.status = "PAID";
      break;
    case "payment_issues":
      params.paymentException = "true";
      break;
    case "returns_cancel":
      params.returnPending = "true";
      break;
    default:
      break;
  }
  return params;
}

export function buildEcommerceSummaryQuery(filters: EcommerceOrdersListFiltersState) {
  if (filters.createdFrom.trim() && filters.createdTo.trim()) {
    return { from: filters.createdFrom.trim(), to: filters.createdTo.trim() };
  }
  return { period: filters.period || "THIS_MONTH" };
}
