import type { EcommerceOrderListItem } from "@/src/types/ecommerce-order";

export type OrderPaymentPresentation = {
  methodLabel: string;
  stateLabel: string;
  collected: boolean;
  tone: "neutral" | "warning" | "success" | "danger";
  helper?: string;
};

export type OrderFulfilmentPresentation = {
  modeLabel: string;
  stateLabel: string;
};

export type OrderListPrimaryAction = {
  label: string;
  href: string;
  variant: "default" | "outline";
};

const FULFILMENT_LABEL: Record<string, string> = {
  BRANCH_PICKUP: "Store pickup",
  DELIVERY: "Home delivery",
};

export function formatOrderInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function orderPaymentPresentation(order: Pick<
  EcommerceOrderListItem,
  | "paymentMethod"
  | "status"
  | "paidAt"
  | "courierCodCollectionStatus"
  | "paymentExceptionStatus"
  | "paymentCompleted"
>): OrderPaymentPresentation {
  const method = String(order.paymentMethod ?? "ONLINE");
  if (order.paymentExceptionStatus) {
    return {
      methodLabel: method === "COD" ? "Cash on delivery" : "Online",
      stateLabel: String(order.paymentExceptionStatus).replaceAll("_", " ").toLowerCase(),
      collected: false,
      tone: "danger",
      helper: "Payment exception — do not treat as successfully collected.",
    };
  }
  if (method === "COD") {
    const courierConfirmed =
      order.courierCodCollectionStatus === "CONFIRMED"
      || order.courierCodCollectionStatus === "BANK_RECONCILED"
      || order.courierCodCollectionStatus === "REMITTANCE_DISCREPANCY";
    if (order.status === "COD_PENDING_ACCEPTANCE") {
      return {
        methodLabel: "Cash on delivery",
        stateLabel: "Awaiting store acceptance",
        collected: false,
        tone: "warning",
        helper: "Courier collects at delivery; bank remittance is reconciled separately.",
      };
    }
    return {
      methodLabel: "Cash on delivery",
      stateLabel: courierConfirmed ? "Courier collection confirmed" : "Due on delivery",
      collected: courierConfirmed,
      tone: courierConfirmed ? "success" : "warning",
      helper: courierConfirmed
        ? "Confirmed from courier evidence — not the same as bank receipt."
        : undefined,
    };
  }
  const paid = Boolean(order.paidAt) || order.paymentCompleted === true;
  if (order.status === "PENDING_PAYMENT") {
    return {
      methodLabel: "Online",
      stateLabel: "Awaiting customer payment",
      collected: false,
      tone: "warning",
      helper: "Not revenue until payment confirms.",
    };
  }
  if (order.status === "PAYMENT_EXPIRED" || order.status === "PAYMENT_FAILED") {
    return {
      methodLabel: "Online",
      stateLabel: order.status === "PAYMENT_EXPIRED" ? "Payment window expired" : "Payment failed",
      collected: false,
      tone: "neutral",
    };
  }
  return {
    methodLabel: "Online",
    stateLabel: paid ? "Paid online" : "Payment not confirmed",
    collected: paid,
    tone: paid ? "success" : "warning",
  };
}

export const formatOrderPaymentState = orderPaymentPresentation;

export function orderFulfilmentPresentation(order: Pick<
  EcommerceOrderListItem,
  "fulfilmentMode" | "status"
>): OrderFulfilmentPresentation {
  const mode = String(order.fulfilmentMode ?? "BRANCH_PICKUP");
  return {
    modeLabel: FULFILMENT_LABEL[mode] ?? mode.replaceAll("_", " ").toLowerCase(),
    stateLabel: String(order.status ?? "").replaceAll("_", " ").toLowerCase(),
  };
}

export function orderListItemNeedsAttention(order: EcommerceOrderListItem) {
  if (order.status === "COD_PENDING_ACCEPTANCE") return true;
  if (order.paymentExceptionStatus) return true;
  if (order.status === "PENDING_PAYMENT") return true;
  return false;
}

export function orderListPrimaryAction(order: EcommerceOrderListItem): OrderListPrimaryAction {
  const id = order.id;
  const href = `/ecommerce/orders/${encodeURIComponent(id)}`;
  if (order.status === "COD_PENDING_ACCEPTANCE") {
    return { label: "Review COD", href, variant: "default" };
  }
  if (order.paymentExceptionStatus) {
    return { label: "Fix payment", href, variant: "default" };
  }
  if (order.status === "PAID" || order.status === "PROCESSING") {
    return { label: "Fulfil", href, variant: "default" };
  }
  return { label: "Open", href, variant: "outline" };
}

export function nextFulfilmentTargets(status: string, fulfilmentMode: string) {
  if (status === "PAID") return ["PROCESSING"];
  if (status === "PROCESSING") {
    return fulfilmentMode === "DELIVERY" ? ["SHIPPED"] : ["READY_FOR_PICKUP"];
  }
  if (status === "READY_FOR_PICKUP" || status === "SHIPPED") return ["DELIVERED"];
  return [];
}
