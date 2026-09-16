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
import { FieldLabel } from "@/src/components/common/page-parts";
import { idempotencyKey, money } from "@/src/lib/format";
import { amountWithinPayableQuote } from "@/src/lib/payment-limits";
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

  useEffect(() => {
    if (!open) return;
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
  const outOfRange =
    !quote?.eligible ||
    !amount ||
    !amountWithinPayableQuote(numericAmount, {
      min: quote?.min ?? 0,
      max: quote?.max ?? 0,
      multipleOf: quote?.multipleOf,
      eligible: quote?.eligible,
    });
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
      submitDisabled={!selectedId || !quote?.eligible || !!outOfRange}
      onSubmit={async () => {
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
        } catch (err: any) {
          const code = err?.data?.code ?? err?.data?.data?.code;
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
            return;
          }
          throw err;
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
                onValueChange={(value) => setSelected(value)}
              >
                <SelectTrigger className="h-11 w-full">
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
              className="h-11"
              type="number"
              min={quote?.min ?? 0}
              max={quote?.max ?? undefined}
              value={amount}
              disabled={!quote?.eligible}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
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
            {outOfRange && quote?.eligible && (
              <p className="mt-2 text-xs text-red-600">
                Enter an amount between {money(quote.min)} and {money(quote.max)}
                {quote.multipleOf ? ` (multiples of ${money(quote.multipleOf)})` : ""}
                .
              </p>
            )}
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
              className="h-11"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR, cheque no., or approval code"
            />
          </div>
        )}
        <div>
          <FieldLabel>Remarks (optional)</FieldLabel>
          <Input
            className="h-11"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Counter note"
          />
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
            disabled={!selectedId || !quote?.eligible || outOfRange}
            onClick={async () => {
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
