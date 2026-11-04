/** RTK mutation argument shapes for ecommerce admin workflows (mirrors admin-api endpoints). */

export type ApiMutationTrigger<TArg> = (args: TArg) => { unwrap: () => Promise<unknown> };

export type DecideEcommerceOrderCancellationArg = {
  orderId: string;
  decision: "APPROVE" | "REJECT";
  expectedVersion: number;
  decisionReason?: string;
  stockDisposition?: "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION";
};

export type InitiateEcommerceOrderCancellationArg = {
  orderId: string;
  reason: string;
  expectedVersion: number;
  idempotencyKey: string;
  stockDisposition?: "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION";
};

export type RecordEcommerceCodCancellationManualRefundArg = {
  orderId: string;
  idempotencyKey: string;
  amountPaise: number;
  recipient: string;
  method: string;
  reference: string;
  proofNote: string;
};

export type DecideEcommerceReturnRequestArg = {
  returnRequestId: string;
  decision: "APPROVE" | "REJECT";
  expectedVersion: number;
  decisionReason?: string;
};

export type RecordEcommerceReturnReceivedArg = {
  returnRequestId: string;
  expectedVersion: number;
  receiptNote?: string;
};

export type RecordEcommerceReturnInspectionArg = {
  returnRequestId: string;
  expectedVersion: number;
  inspectionNote: string;
  inspectionOutcome: "APPROVED_FOR_RESALE" | "REJECTED_NOT_RESALABLE";
  confirmRestockInventory?: boolean;
};

export type CreateEcommerceReturnRefundCaseArg = {
  returnRequestId: string;
  expectedVersion: number;
};

export type RecordEcommerceReturnManualRefundArg = {
  returnRequestId: string;
  expectedVersion: number;
  amountPaise: number;
  recipient: string;
  method: string;
  reference: string;
  proofNote: string;
};

export type ResolveEcommerceReturnRequestArg = {
  returnRequestId: string;
  expectedVersion: number;
  resolutionNote: string;
  replacementOrderId?: string;
  manualSettlementNote?: string;
};
