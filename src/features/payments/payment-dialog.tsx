"use client";

import { useEffect, useMemo, useState } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { PositionChangedDialog } from "@/src/components/common/position-changed-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { apiErrorCode, toastApiError } from "@/src/lib/api-error";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  livePayableAmountError,
  livePaymentReferenceError,
  livePaymentRemarksError,
  PAYMENT_REFERENCE_MAX,
  PAYMENT_REMARKS_MAX,
  paymentAmountReady,
  validatePayableAmount,
  validatePaymentEnrollmentId,
  validatePaymentReference,
  validatePaymentRemarks,
  type PayableQuoteBounds,
} from "@/src/lib/payment-form-validation";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import {
  useCreatePaymentLinkMutation,
  useGetCustomerSchemesQuery,
  useGetEnrollmentQuery,
  useGetEnrollmentsQuery,
  useGetPayableRangeQuery,
  useRecordPaymentMutation,
} from "@/src/store/api/admin-api";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { showPaymentSuccess } from "@/src/store/slices/ui-slice";
import type { Payment } from "@/src/types/domain";

const MODES: { value: Payment["mode"]; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card / POS" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
];

const PAYABLE_STATUSES = new Set(["ACTIVE", "LOCKED", "DEFAULTED"]);

function isPayableEnrollment(row: {
  status?: string;
  canRecordPayment?: boolean;
}) {
  return (
    row.canRecordPayment !== false &&
    PAYABLE_STATUSES.has(String(row.status ?? "").toUpperCase())
  );
}

function patternLabel(mode?: string) {
  if (mode === "FLEXIBLE_FREE_WINDOW") return "Flexible · free window";
  if (mode === "FLEXIBLE_LOCK_WINDOW") return "Flexible · capped";
  return "Fixed installment";
}

function PaymentDialogInner({
  schemeId,
  customerId,
  customer,
  trigger,
  disabled,
  lockScheme = false,
}: {
  schemeId?: string;
  customerId?: string;
  customer?: string;
  trigger?: React.ReactNode;
  disabled?: boolean;
  /** When true, enrollment is fixed (enrollment detail / dues row). */
  lockScheme?: boolean;
}) {
  const dispatch = useAppDispatch();
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const branchId = useActingBranchId();
  const skipGlobalPicker = Boolean(customerId) || lockScheme;
  const globalEnrollments = useGetEnrollmentsQuery(
    { limit: 100, ...(branchId ? { branchId } : {}) },
    { skip: skipGlobalPicker },
  );
  const customerEnrollments = useGetCustomerSchemesQuery(
    { customerId: customerId ?? "", limit: 100 },
    { skip: !customerId },
  );
  const lockedEnrollment = useGetEnrollmentQuery(schemeId ?? "", {
    skip: !lockScheme || !schemeId,
  });
  const enrollmentQuery = customerId ? customerEnrollments : globalEnrollments;
  const options = useMemo(
    () => (enrollmentQuery.data?.items ?? []).filter(isPayableEnrollment),
    [enrollmentQuery.data?.items],
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const showEnrollmentPicker = !lockScheme;
  const selectedId =
    (lockScheme && schemeId) ||
    selected ||
    (customerId && options.length === 1 ? options[0]?.id : "") ||
    "";
  const selectedRow =
    options.find((row: any) => row.id === selectedId) ??
    (lockScheme && lockedEnrollment.data ? lockedEnrollment.data : undefined);
  const quoteQuery = useGetPayableRangeQuery(
    { schemeId: selectedId },
    { skip: !open || !selectedId },
  );
  const quote = quoteQuery.data;
  const displayMode = quote?.displayMode ?? selectedRow?.displayMode ?? "FIXED";
  const isFlexiblePayment =
    quote?.paymentPattern === "FLEXIBLE" ||
    displayMode.startsWith("FLEXIBLE");
  const [amount, setAmount] = useState<number | "">("");
  const [mode, setMode] = useState<Payment["mode"]>("CASH");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [recordPayment] = useRecordPaymentMutation();
  const [createPaymentLink] = useCreatePaymentLinkMutation();
  const [positionOpen, setPositionOpen] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<(() => void) | null>(null);
  const [positionAmounts, setPositionAmounts] = useState({ old: 0, new: 0 });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [enrollmentTouched, setEnrollmentTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const quoteBounds: PayableQuoteBounds | undefined = quote
    ? {
        min: quote.min,
        max: quote.max,
        multipleOf: quote.multipleOf,
        eligible: quote.eligible,
      }
    : undefined;

  useEffect(() => {
    if (!open) {
      setFieldErrors({});
      setEnrollmentTouched(false);
      setAmountTouched(false);
      return;
    }
    if (lockScheme && schemeId) {
      setSelected(schemeId);
      return;
    }
    if (customerId && options.length === 1) {
      setSelected(options[0].id);
      return;
    }
    if (customerId && options.length !== 1) {
      setSelected("");
    }
  }, [open, customerId, lockScheme, schemeId, options]);

  useEffect(() => {
    if (!quote) return;
    setAmount(quote.suggested ?? "");
  }, [quote?.schemeId, quote?.positionVersion, quote?.suggested]);

  const numericAmount = typeof amount === "number" ? amount : 0;

  const enrollmentError =
    fieldErrors.schemeId ??
    (enrollmentTouched && showEnrollmentPicker
      ? validatePaymentEnrollmentId(selectedId)
      : undefined);

  const amountError =
    fieldErrors.amount ??
    (amountTouched || amount !== ""
      ? livePayableAmountError(amount, quoteBounds)
      : undefined);

  const referenceError =
    fieldErrors.reference ?? livePaymentReferenceError(reference);
  const remarksError =
    fieldErrors.remarks ?? livePaymentRemarksError(remarks);

  const formReady =
    paymentAmountReady(amount, quoteBounds) &&
    validatePaymentEnrollmentId(selectedId) === undefined &&
    validatePaymentReference(reference) === undefined &&
    validatePaymentRemarks(remarks) === undefined;
  const cappedChipAmounts = useMemo(() => {
    if (displayMode !== "FLEXIBLE_LOCK_WINDOW" || !quote?.eligible) return [];
    const max = quote.remainingThisCycle ?? quote.max ?? 0;
    const step = quote.multipleOf ?? 100;
    const values: number[] = [];
    for (let v = quote.min; v <= max; v += step) {
      if (v > 0) values.push(v);
      if (values.length >= 6) break;
    }
    if (max > 0 && !values.includes(max)) values.push(max);
    return values;
  }, [displayMode, quote]);
  const chips =
    displayMode === "FIXED"
      ? [
          quote?.suggested,
          (quote?.suggested ?? 0) * 2,
          (quote?.suggested ?? 0) * 3,
        ].filter(
          (value): value is number => !!value && value <= (quote?.max ?? 0),
        )
      : displayMode === "FLEXIBLE_FREE_WINDOW"
        ? [500, 1000, 2500, 5000, 10000].filter(
            (value) =>
              value >= (quote?.min ?? 0) && value <= (quote?.max ?? Infinity),
          )
        : cappedChipAmounts.length
          ? cappedChipAmounts
          : [quote?.remainingThisCycle ?? quote?.max].filter(
              (value): value is number => !!value,
            );

  return (
    <>
    <PositionChangedDialog
      open={positionOpen}
      onOpenChange={setPositionOpen}
      previousAmount={positionAmounts.old}
      newAmount={positionAmounts.new}
      onConfirm={() => pendingRetry?.()}
    />
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      className="sm:max-w-lg"
      trigger={
        trigger ?? (
          <Button disabled={disabled}>
            <HandCoins />
            Collect payment
          </Button>
        )
      }
      title="Collect payment"
      description={
        customerId
          ? customer
            ? `Choose which enrollment to pay for ${customer}. Amount limits come from the payable-range API.`
            : "Choose an enrollment for this customer. Amount limits come from the payable-range API."
          : "Select the enrollment to collect against. Amount limits come from the payable-range API."
      }
      actionLabel={
        quote?.eligible ? `Collect ${money(numericAmount || 0)}` : "Not payable"
      }
      submitDisabled={!formReady}
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: { amountPaise: "amount", schemeId: "schemeId" },
          fallback: "Could not record payment",
        });
      }}
      onSubmit={async () => {
        setEnrollmentTouched(true);
        setAmountTouched(true);
        const clientErrors: Record<string, string> = {};
        const enrollErr = validatePaymentEnrollmentId(selectedId);
        if (enrollErr) clientErrors.schemeId = enrollErr;
        const amtErr = validatePayableAmount(amount, quoteBounds);
        if (amtErr) clientErrors.amount = amtErr;
        const refErr = validatePaymentReference(reference);
        if (refErr) clientErrors.reference = refErr;
        const remErr = validatePaymentRemarks(remarks);
        if (remErr) clientErrors.remarks = remErr;
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }

        const submit = async () => {
          const row = await recordPayment({
            schemeId: selectedId,
            amount: numericAmount,
            mode,
            reference: reference || undefined,
            remarks: remarks || undefined,
            targetCycle: isFlexiblePayment
              ? quote?.targetCycle || undefined
              : undefined,
            expectedPositionVersion: isFlexiblePayment
              ? (quote?.positionVersion ?? 0)
              : undefined,
            idempotencyKey: idempotencyKey(),
          }).unwrap();
          dispatch(
            showPaymentSuccess({
              paymentId: row.id,
              receiptNo: row.receiptNo,
              amount: numericAmount,
              customer: row.customer || selectedRow?.customer,
              enrollmentNo: row.enrollmentNo || selectedRow?.enrollmentNo,
              mode,
              allocation:
                displayMode === "FIXED"
                  ? "Allocated to oldest pending installment"
                  : quote?.helperText || "Applied to current enrollment balance",
              whatsappStatus: "QUEUED",
              passbookImageStatus: "GENERATING",
            }),
          );
        };
        try {
          await submit();
        } catch (err: unknown) {
          const code = apiErrorCode(err);
          if (
            code === "SCHEME_POSITION_CHANGED" ||
            code === "PAYMENT_POSITION_CHANGED"
          ) {
            const refreshed = await quoteQuery.refetch();
            const newSuggested = refreshed.data?.suggested ?? numericAmount;
            setPositionAmounts({ old: numericAmount, new: newSuggested });
            setPendingRetry(() => () => {
              setAmount(newSuggested);
              void submit();
            });
            setPositionOpen(true);
            return false;
          }
          toastApiError(err, "Could not record payment");
          return false;
        }
      }}
    >
      <div className="grid gap-4">
        {showEnrollmentPicker && (
          <div>
            <FieldLabel>Enrollment</FieldLabel>
            {options.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                {customerId
                  ? "This customer has no payable enrollments. Create an enrollment first."
                  : "No payable enrollments match the current filters."}
              </div>
            ) : (
              <Select
                value={selectedId || undefined}
                onValueChange={(value) => {
                  setSelected(value);
                  setEnrollmentTouched(true);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.schemeId;
                    return next;
                  });
                }}
              >
                <SelectTrigger
                  className={cn("h-11 w-full", enrollmentError && "border-red-600")}
                  aria-invalid={Boolean(enrollmentError)}
                  onBlur={() => setEnrollmentTouched(true)}
                >
                  <SelectValue
                    placeholder={
                      customer
                        ? `Select ${customer}'s enrollment`
                        : "Select enrollment"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options.map((row: any) => (
                    <SelectItem key={row.id} value={row.id}>
                      {customerId
                        ? `${row.plan ?? row.enrollmentNo} · ${row.enrollmentNo} · ${patternLabel(row.displayMode)}`
                        : `${row.customer} · ${row.enrollmentNo} · ${patternLabel(row.displayMode)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormFieldError message={enrollmentError} />
          </div>
        )}

        {quoteQuery.isFetching && (
          <p className="text-sm text-muted-foreground">
            Loading payable position…
          </p>
        )}

        {quote && !quote.eligible && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {quote.helperText || quote.blockingReasons?.[0]?.message}
          </div>
        )}

        {displayMode === "FLEXIBLE_LOCK_WINDOW" && quote?.eligible && (
          <div className="rounded-xl border border-[#eadbb5] bg-[#fff8e8] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
              Capped cycle
            </p>
            <h3 className="mt-1 font-bold">{quote.cycleLabel}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {quote.formulaLabel}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-white p-2">
                <div className="text-xs text-muted-foreground">Cap</div>
                <strong>{money(quote.currentCycleCap ?? 0)}</strong>
              </div>
              <div className="rounded-lg bg-white p-2">
                <div className="text-xs text-muted-foreground">Paid</div>
                <strong>{money(quote.confirmedThisCycle ?? 0)}</strong>
              </div>
              <div className="rounded-lg bg-white p-2">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <strong>{money(quote.remainingThisCycle ?? 0)}</strong>
              </div>
            </div>
            {quote.finalRemainderException && (
              <p className="mt-3 text-xs text-[#805817]">
                ₹{quote.max} is the last of this month’s allowance, so the usual
                minimum does not apply.
              </p>
            )}
          </div>
        )}

        {displayMode === "FLEXIBLE_FREE_WINDOW" && quote?.eligible && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <strong>Flexible window — pay any amount</strong>
            <p className="mt-1 text-muted-foreground">{quote.helperText}</p>
          </div>
        )}

        {displayMode === "FIXED" && quote?.eligible && (
          <div className="rounded-xl border bg-[#fbf7f4] p-4 text-sm">
            <strong>Fixed installment</strong>
            <p className="mt-1 text-muted-foreground">{quote.helperText}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Amount</FieldLabel>
            <Input
              className={cn("h-11", amountError && "border-red-600")}
              type="number"
              min={quote?.min ?? 0}
              max={quote?.max ?? undefined}
              value={amount}
              disabled={!quote?.eligible}
              aria-invalid={Boolean(amountError)}
              onChange={(e) => {
                setAmountTouched(true);
                setAmount(
                  e.target.value === "" ? "" : Number(e.target.value),
                );
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.amount;
                  return next;
                });
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={numericAmount === value ? "default" : "outline"}
                  onClick={() => setAmount(value)}
                >
                  {money(value)}
                </Button>
              ))}
            </div>
            <FormFieldError message={amountError} />
          </div>
          <div>
            <FieldLabel>Payment mode</FieldLabel>
            <Select
              value={mode}
              onValueChange={(value) => setMode(value as Payment["mode"])}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode !== "CASH" && (
          <div>
            <FieldLabel>Reference (optional)</FieldLabel>
            <Input
              className={cn("h-11", referenceError && "border-red-600")}
              value={reference}
              maxLength={PAYMENT_REFERENCE_MAX}
              aria-invalid={Boolean(referenceError)}
              onChange={(e) => {
                setReference(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.reference;
                  return next;
                });
              }}
              placeholder="UTR, cheque no., or approval code"
            />
            <FormFieldError message={referenceError} />
          </div>
        )}
        <div>
          <FieldLabel>Remarks (optional)</FieldLabel>
          <Input
            className={cn("h-11", remarksError && "border-red-600")}
            value={remarks}
            maxLength={PAYMENT_REMARKS_MAX}
            aria-invalid={Boolean(remarksError)}
            onChange={(e) => {
              setRemarks(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.remarks;
                return next;
              });
            }}
            placeholder="Counter note"
          />
          <FormFieldError message={remarksError} />
        </div>
        {quote?.nextCycleAction?.available ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              quoteQuery.refetch();
              toast.message(`Re-quoted for ${quote.nextCycleAction?.cycleLabel ?? "next cycle"}`);
            }}
          >
            Pay next cycle
          </Button>
        ) : null}
        {caps?.onlinePayments !== false ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!formReady}
            onClick={async () => {
              setAmountTouched(true);
              const amtErr = validatePayableAmount(amount, quoteBounds);
              if (amtErr) {
                setFieldErrors((prev) => ({ ...prev, amount: amtErr }));
                toast.error(amtErr);
                return;
              }
              try {
                const link = await createPaymentLink({
                  schemeId: selectedId,
                  amount: numericAmount,
                  targetCycle: isFlexiblePayment
                    ? quote?.targetCycle || undefined
                    : undefined,
                  expectedPositionVersion: isFlexiblePayment
                    ? (quote?.positionVersion ?? 0)
                    : undefined,
                  idempotencyKey: idempotencyKey(),
                }).unwrap();
                toast.success(`Payment link sent · expires ${link.expiresAt}`);
              } catch (err) {
                toastApiError(err, "Could not create payment link");
              }
            }}
          >
            Send payment link (WhatsApp)
          </Button>
        ) : null}
      </div>
    </ActionDialog>
    </>
  );
}

export function PaymentDialog(
  props: Parameters<typeof PaymentDialogInner>[0],
) {
  return (
    <PermissionGate permission={ACTION.paymentRecord} fallback={null}>
      <PaymentDialogInner {...props} />
    </PermissionGate>
  );
}
