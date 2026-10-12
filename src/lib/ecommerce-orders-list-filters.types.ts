export type EcommerceOrdersListQueryParams = {
  limit?: number;
  cursor?: string;
  q?: string;
  status?: string;
  paymentMethod?: string;
  fulfilmentMode?: string;
  createdFrom?: string;
  createdTo?: string;
  period?: string;
  paymentException?: "true";
  codPendingAcceptance?: "true";
  cancellationPending?: "true";
  returnPending?: "true";
  collected?: "true" | "false";
};
