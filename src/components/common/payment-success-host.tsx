"use client";

import { PaymentSuccessSheet } from "@/src/components/common/payment-success-sheet";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setPaymentSuccessOpen } from "@/src/store/slices/ui-slice";

export function PaymentSuccessHost() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.paymentSuccessOpen);
  const result = useAppSelector((s) => s.ui.paymentSuccess);

  return (
    <PaymentSuccessSheet
      open={open}
      onOpenChange={(next) => dispatch(setPaymentSuccessOpen(next))}
      result={result}
    />
  );
}
