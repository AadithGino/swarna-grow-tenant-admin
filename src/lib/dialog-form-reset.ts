/** Default empty enrolment create form — reset when the dialog closes. */
export const EMPTY_ENROLMENT_CREATE_FORM = {
  customerId: "",
  planId: "",
  amount: 0,
  firstInstallmentMode: "COLLECT_NOW" as const,
  paymentMode: "CASH" as "CASH" | "CARD" | "UPI" | "BANK_TRANSFER",
  paymentReference: "",
  paymentRemarks: "",
};
