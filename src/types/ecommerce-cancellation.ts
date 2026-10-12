export type EcommerceCancellationStockDisposition = "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION";

export type EcommerceCancellationRequestStatus =
  | "PENDING_DECISION"
  | "APPROVED_PROCESSING"
  | "REJECTED"
  | "COMPLETED"
  | "WITHDRAWN";

export type EcommerceOrderCancellationRequest = {
  id: string;
  orderId?: string;
  kind?: string;
  status: EcommerceCancellationRequestStatus | string;
  reason?: string;
  decisionReason?: string | null;
  version?: number;
  stockDisposition?: EcommerceCancellationStockDisposition | null;
  onlineRefundId?: string | null;
  codManualRefund?: Record<string, unknown> | null;
};

export type EcommerceOrderCancellationCapabilities = {
  directCancelAllowed?: boolean;
  directCancelBlockCode?: string | null;
  cancellationRequestAllowed?: boolean;
  cancellationRequestBlockCode?: string | null;
  contactStoreForReturn?: boolean;
  adminCancelAllowed?: boolean;
};

export type EcommerceOrderCancellationView = {
  capabilities?: EcommerceOrderCancellationCapabilities;
  activeRequest?: EcommerceOrderCancellationRequest | null;
  request?: EcommerceOrderCancellationRequest | null;
  history?: EcommerceOrderCancellationRequest[];
};

export type ShopOrderCancellationAttachment = {
  capabilities: EcommerceOrderCancellationCapabilities;
  request: EcommerceOrderCancellationRequest | null;
};
