"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import type {
  EnrolFirstPaymentAction,
  EnrolFirstPaymentFields,
} from "@/src/lib/enrol-first-payment";
import {
  V1_MANUAL_PAYMENT_MODES,
  type V1ManualPaymentMode,
} from "@/src/lib/v1-payment-modes";
import { cn } from "@/lib/utils";

const MODES: { value: V1ManualPaymentMode; label: string }[] = [
  ...V1_MANUAL_PAYMENT_MODES,
];

export function EnrolFirstPaymentAtEnrolment({
  onlinePayments,
  value,
  onChange,
  fieldErrors,
}: {
  onlinePayments: boolean;
  value: EnrolFirstPaymentFields;
  onChange: (next: EnrolFirstPaymentFields) => void;
  fieldErrors: Record<string, string>;
}) {
  const actionOptions: ReadonlyArray<
    readonly [EnrolFirstPaymentAction, string]
  > = [
    ["RECORD_MANUAL_PAYMENT", "Record manual payment now"],
    ...(onlinePayments
      ? ([["CREATE_PAYMENT_LINK", "Send payment link only"]] as const)
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>First payment at enrolment</FieldLabel>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {actionOptions.map(([action, label]) => (
            <button
              key={action}
              type="button"
              className={cn(
                "rounded-xl border p-3 text-left text-sm transition-colors",
                value.firstInstallmentAction === action
                  ? "border-[#730321] bg-[#fff5f7]"
                  : "border-[#e3d5d0] hover:border-[#9f6673]",
              )}
              onClick={() =>
                onChange({ ...value, firstInstallmentAction: action })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <FormFieldError message={fieldErrors.firstInstallmentAction} />
      </div>
      {value.firstInstallmentAction === "RECORD_MANUAL_PAYMENT" ? (
        <>
          <div>
            <FieldLabel>Payment mode</FieldLabel>
            <Select
              value={value.paymentMode}
              onValueChange={(paymentMode) =>
                onChange({
                  ...value,
                  paymentMode: paymentMode as EnrolFirstPaymentFields["paymentMode"],
                })
              }
            >
              <SelectTrigger
                className={cn(
                  "mt-0 h-11 w-full rounded-xl bg-[#faf7f5]",
                  fieldErrors.paymentMode && "border-red-600",
                )}
                aria-invalid={Boolean(fieldErrors.paymentMode)}
              >
                <SelectValue placeholder="How did they pay?" />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormFieldError message={fieldErrors.paymentMode} />
          </div>
          <div>
            <FieldLabel>Reference (optional)</FieldLabel>
            <Input
              className={cn(
                "h-11 rounded-xl bg-[#faf7f5]",
                fieldErrors.paymentReference && "border-red-600",
              )}
              value={value.paymentReference}
              aria-invalid={Boolean(fieldErrors.paymentReference)}
              onChange={(e) =>
                onChange({ ...value, paymentReference: e.target.value })
              }
              placeholder="UTR, transfer ref., or approval code"
            />
            <FormFieldError message={fieldErrors.paymentReference} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          The enrollment stays pending until the customer pays via the link you
          send after creation.
        </p>
      )}
    </div>
  );
}
