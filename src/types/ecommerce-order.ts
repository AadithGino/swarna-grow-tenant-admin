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

export type EcommerceCourierCodBlock = {
  providerId?: string;
  trackingReference?: string | null;
  expectedAmountPaise?: number | null;
  collectionStatus?: string | null;
  collectionConfirmedAt?: string | null;
  collectionReference?: string | null;
  collectionSource?: string | null;
  collectionSourceLabel?: string | null;
  collectionEvidenceNote?: string | null;
  remittanceStatus?: string | null;
  activeRemittanceBatchId?: string | null;
  remittanceGrossPaise?: number | null;
  remittanceFeePaise?: number | null;
  remittanceNetPaise?: number | null;
  bankCreditReference?: string | null;
  bankCreditedAt?: string | null;
  reconciliationStatus?: string | null;
  reconciliationDiscrepancyPaise?: number | null;
  courierIntegrationLive?: boolean;
};

export type EcommerceFulfilmentHandoverBlock = {
  method?: string | null;
  recipientName?: string | null;
  recordedAt?: string | null;
  deliveryProofReference?: string | null;
  pickupCodeActive?: boolean;
  pickupCodeExpiresAt?: string | null;
};

export type EcommerceOrderListItem = {
  id: string;
  orderNumber?: string;
  status: string;
  statusLabel?: string;
  paymentMethod?: string;
  courierCodCollectionStatus?: string | null;
  courierCodRemittanceStatus?: string | null;
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
    codCourierCollectionConfirmed?: EcommerceMoneyRef;
    codBankRemittanceReconciled?: EcommerceMoneyRef;
    codBankRemittanceGross?: EcommerceMoneyRef;
    codBankRemittanceFees?: EcommerceMoneyRef;
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

export type EcommerceCourierCodWorkspaceSummary = {
  courierIntegrationConfigured: boolean;
  courierIntegrationLabel: string;
  collectionPendingCount: number;
  collectionConfirmedCount: number;
  remittanceOwedCount: number;
  remittanceBatchPendingCount: number;
  bankReconciledCount: number;
  remittanceOwedPaise: number;
  remittanceDiscrepancyCount?: number;
};

export type EcommerceCodRemittanceBatch = {
  _id: string;
  status: string;
  statementReference?: string;
  grossTotalPaise?: number;
  feeTotalPaise?: number;
  netExpectedPaise?: number;
  bankCreditReference?: string;
  bankCreditPaise?: number;
  bankCreditedAt?: string;
  reconciliationStatus?: string;
  reconciliationNote?: string;
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
  courierCod?: EcommerceCourierCodBlock | null;
  fulfilmentHandover?: EcommerceFulfilmentHandoverBlock | null;
  courierCodCollectionStatus?: string | null;
  courierCodRemittanceStatus?: string | null;
  codBankRemittanceReconciled?: boolean | null;
};

export type EcommerceOrderPaymentExceptionRefund = {
  status?: string;
  providerRefundId?: string | null;
};
