export type EcommerceCustomerDisplay = {
  customerId: string | null;
  name: string | null;
  maskedMobile: string | null;
  customerNumber?: string | null;
};

export type EcommerceOrderLine = {
  productId?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unitPricePaise?: number;
  lineTotalPaise?: number;
};

export type EcommerceOrderListItem = {
  id: string;
  orderNumber?: string;
  status: string;
  statusLabel?: string;
  paymentMethod?: string;
  codCollectionStatus?: string | null;
  paidAt?: string | null;
  paymentCompleted?: boolean;
  paymentExceptionStatus?: string | null;
  fulfilmentMode?: string | null;
  lines?: EcommerceOrderLine[];
  totalPaise?: number;
  createdAt?: string | null;
  customerId?: string;
  customerDisplay?: EcommerceCustomerDisplay | null;
  version?: number;
};

export type EcommerceOrdersListMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  totalCount?: number;
  totalCountCapped?: boolean;
  sort?: string;
};

export type EcommerceMoneyRef = {
  amountPaise: number;
  amountDisplay: string;
};

export type EcommerceWorkspaceSummary = {
  period: { from: string; to: string; timezone?: string };
  generatedAt: string;
  placement: {
    ordersPlaced: number;
    onlinePaidOrdersPlacedInPeriod: number;
    codPendingAcceptancePlacedInPeriod: number;
  };
  pipeline: {
    awaitingFulfilment: number;
    readyForPickup: number;
    shipped: number;
    delivered: number;
    openCancellationRequests: number;
    openReturnRequests: number;
    paymentExceptionsOpen: number;
  };
  collections: {
    onlineCollected?: EcommerceMoneyRef;
    codCollected?: EcommerceMoneyRef;
    grossCollected: EcommerceMoneyRef;
    providerRefundOutflow?: EcommerceMoneyRef;
    manualRefundOutflow?: EcommerceMoneyRef;
    refundOutflow?: EcommerceMoneyRef;
    netCollected: EcommerceMoneyRef;
    collectedOrderCount: number;
    averageCollectedOrderValue?: EcommerceMoneyRef;
  };
};

export type EcommerceOrderReturnSummary = {
  id: string;
  orderId?: string;
  kind?: string;
  status: string;
  reason?: string;
  version?: number;
  onlineRefundId?: string | null;
  manualRefundRecordedAt?: string | null;
  createdAt?: string | null;
};

export type EcommerceOrderReturnView = {
  orderId: string;
  activeRequest: EcommerceOrderReturnSummary | null;
  items: EcommerceOrderReturnSummary[];
};

export type EcommerceOrderDetail = EcommerceOrderListItem & {
  quoteId?: string | null;
  subtotalPaise?: number;
  taxPaise?: number;
  fulfilmentChargePaise?: number;
  financialSnapshot?: Record<string, unknown>;
  addressSnapshot?: Record<string, unknown> | null;
  pickupBranchId?: string | null;
  deliveryTracking?: Record<string, unknown> | null;
  invoiceAvailable?: boolean;
  expiresAt?: string | null;
  returnSummary?: {
    activeRequest: EcommerceOrderReturnSummary | null;
    recent: EcommerceOrderReturnSummary[];
  };
  stockReleaseReason?: string | null;
};

export type EcommerceOrderPaymentExceptionRefund = {
  status?: string;
  providerRefundId?: string | null;
};
