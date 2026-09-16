"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  HANDOVER_REMARKS_MAX,
  liveHandoverAmountError,
  liveHandoverRemarksError,
  markCashHandoverFormReady,
  validateHandoverAmount,
  validateHandoverReceiptCount,
  validateHandoverRemarks,
  validateHandoverStaffId,
} from "@/src/lib/cash-handover-form-validation";
import { cn } from "@/lib/utils";
import { ACTION } from "@/src/lib/action-permissions";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  useCreateAdminHandoverMutation,
  useGetStaffCashDetailQuery,
} from "@/src/store/api/admin-api";

export type CashStaffRow = {
  id: string;
  name: string;
  branch: string;
  balance: number;
};

function MarkCashSubmittedDialogInner({
  staffList,
  staff: initialStaff,
  trigger,
  open,
  onOpenChange,
}: {
  staffList: CashStaffRow[];
  staff?: CashStaffRow | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [createHandover] = useCreateAdminHandoverMutation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [staffId, setStaffId] = useState(initialStaff?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(1);
  const [autoAccept, setAutoAccept] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffTouched, setStaffTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [receiptTouched, setReceiptTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const detailQuery = useGetStaffCashDetailQuery(staffId, {
    skip: !isOpen || !staffId,
  });
  const collections = detailQuery.data?.collections ?? [];

  const selected =
    staffList.find((s) => s.id === staffId) ?? initialStaff ?? null;

  useEffect(() => {
    if (!isOpen) {
      setPhase("form");
      return;
    }
    if (initialStaff) {
      setStaffId(initialStaff.id);
      setAmount(initialStaff.balance);
      setReceiptCount(Math.max(1, Math.round(initialStaff.balance / 2500)));
    } else {
      setStaffId("");
      setAmount(0);
      setReceiptCount(1);
    }
    setAutoAccept(true);
    setPhase("form");
    setStaffTouched(false);
    setAmountTouched(false);
    setReceiptTouched(false);
    setFieldErrors({});
  }, [isOpen, initialStaff, staffList]);

  const cashInHand = selected?.balance;
  const staffError =
    fieldErrors.staffId ??
    (staffTouched ? validateHandoverStaffId(staffId) : undefined);
  const amountError =
    fieldErrors.amount ??
    (amountTouched || amount > 0
      ? liveHandoverAmountError(amount, cashInHand)
      : undefined);
  const receiptError =
    fieldErrors.receiptCount ??
    (receiptTouched ? validateHandoverReceiptCount(receiptCount) : undefined);
  const remarksError =
    fieldErrors.remarks ?? liveHandoverRemarksError(remarks);

  const formReady = markCashHandoverFormReady({
    staffId,
    amount,
    receiptCount,
    remarks,
    cashInHand,
  });

  useEffect(() => {
    if (initialStaff || !isOpen) return;
    const member = staffList.find((s) => s.id === staffId);
    if (member) {
      setAmount(member.balance);
      setReceiptCount(Math.max(1, Math.round(member.balance / 2500)));
    }
  }, [staffId, staffList, initialStaff, isOpen]);

  useEffect(() => {
    if (detailQuery.data?.receiptCount && phase === "form") {
      setReceiptCount(Math.max(1, detailQuery.data.receiptCount));
    }
    const inHand = detailQuery.data?.cashInHand;
    if (inHand && phase === "form" && !initialStaff) {
      const rupees = typeof inHand === "object" ? inHand.amountPaise / 100 : Number(inHand) / 100;
      if (rupees > 0) setAmount(rupees);
    }
  }, [detailQuery.data?.receiptCount, detailQuery.data?.cashInHand, phase, initialStaff]);

  const submitHandover = async () => {
    setStaffTouched(true);
    setAmountTouched(true);
    setReceiptTouched(true);
    const clientErrors: Record<string, string> = {};
    const staffErr = validateHandoverStaffId(staffId);
    if (staffErr) clientErrors.staffId = staffErr;
    const amtErr = validateHandoverAmount(amount, cashInHand);
    if (amtErr) clientErrors.amount = amtErr;
    const rcErr = validateHandoverReceiptCount(receiptCount);
    if (rcErr) clientErrors.receiptCount = rcErr;
    const remErr = validateHandoverRemarks(remarks);
    if (remErr) clientErrors.remarks = remErr;
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      toast.error("Fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const row = await createHandover({
        staffId,
        amountPaise: Math.round(amount * 100),
        receiptCount,
        autoAccept,
        acceptanceRemarks: remarks.trim() || undefined,
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      toast.success(
        autoAccept
          ? `${row.handoverNo} recorded — ${selected?.name}'s balance updated`
          : `${row.handoverNo} pending — another user must accept under Handovers`,
      );
      setRemarks("");
      setOpen(false);
    } catch (err: unknown) {
      toastApiError(
        err,
        "Could not record cash handover. Check the amount against cash in hand.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={dialogScrollShellClass}>
        <DialogBody className="pb-2">
          <DialogHeader>
            <DialogTitle>Receive cash from staff</DialogTitle>
            <DialogDescription>
              Review itemised cash collections, then record the handover to update
              branch balances.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {phase === "form" ? (
              <>
                <div>
                  <FieldLabel>Staff member</FieldLabel>
                  <Select
                    value={staffId}
                    onValueChange={(value) => {
                      setStaffId(value);
                      setStaffTouched(true);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.staffId;
                        return next;
                      });
                    }}
                    disabled={Boolean(initialStaff)}
                  >
                    <SelectTrigger
                      className={cn("h-11 w-full", staffError && "border-red-600")}
                      aria-invalid={Boolean(staffError)}
                      onBlur={() => setStaffTouched(true)}
                    >
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.branch} · {money(s.balance)} in hand
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormFieldError message={staffError} />
                </div>
                {selected && (
                  <div className="rounded-xl border border-[#eaded9] bg-[#fbf8f5] px-4 py-3 text-sm">
                    <strong>Cash in hand</strong>
                    <p className="mt-1 text-muted-foreground">
                      {money(selected.balance)} available to hand over
                    </p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Amount submitted</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      className={cn("h-11", amountError && "border-red-600")}
                      value={amount || ""}
                      aria-invalid={Boolean(amountError)}
                      onChange={(e) => {
                        setAmountTouched(true);
                        setAmount(Number(e.target.value));
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.amount;
                          return next;
                        });
                      }}
                    />
                    <FormFieldError message={amountError} />
                  </div>
                  <div>
                    <FieldLabel>Receipt count</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      className={cn("h-11", receiptError && "border-red-600")}
                      value={receiptCount}
                      aria-invalid={Boolean(receiptError)}
                      onChange={(e) => {
                        setReceiptTouched(true);
                        setReceiptCount(Number(e.target.value));
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.receiptCount;
                          return next;
                        });
                      }}
                    />
                    <FormFieldError message={receiptError} />
                  </div>
                </div>
                {detailQuery.isFetching ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading collections…
                  </p>
                ) : collections.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Receipt</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {collections.map((row: any) => (
                          <tr key={row.receiptNo}>
                            <td className="px-3 py-2 font-mono text-xs">
                              {row.receiptNo}
                            </td>
                            <td className="px-3 py-2">{row.customer}</td>
                            <td className="px-3 py-2 text-right">
                              {money(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <details className="rounded-xl border border-[#eaded9] bg-[#fbf8f5] px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium text-[#5c4a4e]">
                    Advanced — defer acceptance
                  </summary>
                  <label className="mt-3 flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={!autoAccept}
                      onCheckedChange={(v) => setAutoAccept(v !== true)}
                      className="mt-0.5"
                    />
                    <span className="text-muted-foreground">
                      Create as <strong>PENDING</strong> (second person must accept
                      on the Handovers tab).
                    </span>
                  </label>
                </details>
                <div>
                  <FieldLabel>Remarks</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Optional — shown on acceptance audit trail"
                    value={remarks}
                    maxLength={HANDOVER_REMARKS_MAX}
                    className={cn(remarksError && "border-red-600")}
                    aria-invalid={Boolean(remarksError)}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.remarks;
                        return next;
                      });
                    }}
                  />
                  <FormFieldError message={remarksError} />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border bg-[#fbf8f5] p-4 text-sm">
                  <strong>Confirm handover</strong>
                  <p className="mt-2 text-muted-foreground">
                    {selected?.name} · {money(amount)} · {receiptCount} receipt
                    {receiptCount === 1 ? "" : "s"}
                    {autoAccept ? " · auto-accept" : " · pending acceptance"}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Receipt</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {collections.map((row: any) => (
                        <tr key={row.receiptNo}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {row.receiptNo}
                          </td>
                          <td className="px-3 py-2">{row.customer}</td>
                          <td className="px-3 py-2 text-right">
                            {money(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (phase === "confirm") setPhase("form");
              else setOpen(false);
            }}
          >
            {phase === "confirm" ? "Back" : "Cancel"}
          </Button>
          {phase === "form" ? (
            <Button
              disabled={!formReady || detailQuery.isFetching}
              onClick={() => {
                setStaffTouched(true);
                setAmountTouched(true);
                setReceiptTouched(true);
                if (!formReady) {
                  toast.error("Fix the highlighted fields.");
                  return;
                }
                setPhase("confirm");
              }}
            >
              Review & confirm
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void submitHandover()}>
              {busy && <Loader2 className="animate-spin" />}
              Confirm receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarkCashSubmittedDialog(
  props: Parameters<typeof MarkCashSubmittedDialogInner>[0],
) {
  return (
    <PermissionGate permission={ACTION.cashHandoverAccept} fallback={null}>
      <MarkCashSubmittedDialogInner {...props} />
    </PermissionGate>
  );
}
