import type { EcommerceOrderListItem } from "@/src/types/ecommerce-order";
import { plainLanguageStatusLabel } from "@/src/lib/plain-language-labels";

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

/** COD home delivery after mark-delivered — payment evidence from courier collection. */
export function codDeliveredFulfilmentLabel(order: {
  status?: string;
  paymentMethod?: string;
  courierCod?: { collectionStatus?: string | null } | null;
  courierCodCollectionStatus?: string | null;
}): string | undefined {
  if (String(order.status ?? "") !== "DELIVERED") return undefined;
  if (String(order.paymentMethod ?? "") !== "COD") return undefined;
  const collection = String(
    order.courierCod?.collectionStatus ?? order.courierCodCollectionStatus ?? "",
  );
  if (collection === "CONFIRMED") return "Delivered & payment collected";
  return "Delivered · Payment unconfirmed.";
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
    const collectionConfirmed = order.courierCodCollectionStatus === "CONFIRMED";
    const needsReview = order.courierCodCollectionStatus === "NEEDS_REVIEW";
    if (order.status === "COD_PENDING_ACCEPTANCE") {
      return {
        methodLabel: "Cash on delivery",
        stateLabel: "Awaiting store acceptance",
        collected: false,
        tone: "warning",
        helper: "Courier collects at delivery; bank remittance is reconciled separately.",
      };
    }
    const stateLabel = collectionConfirmed
      ? "Customer paid"
      : needsReview
        ? "Payment being checked"
        : "Payment unconfirmed";
    return {
      methodLabel: "Cash on delivery",
      stateLabel,
      collected: collectionConfirmed,
      tone: collectionConfirmed ? "success" : needsReview ? "warning" : "warning",
      helper: collectionConfirmed
        ? "Courier payment may still be pending until bank receipt is recorded."
        : "Based on courier collection evidence — not inferred from shipment status.",
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
  const status = String(order.status ?? "");
  return {
    modeLabel: FULFILMENT_LABEL[mode] ?? mode.replaceAll("_", " ").toLowerCase(),
    stateLabel: plainLanguageStatusLabel(status) ?? status.replaceAll("_", " ").toLowerCase(),
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
  if (status === "PAID" || status === "PROCESSING") {
    return fulfilmentMode === "DELIVERY" ? ["SHIPPED"] : ["READY_FOR_PICKUP"];
  }
  if (status === "SHIPPED") return ["DELIVERED"];
  return [];
}
