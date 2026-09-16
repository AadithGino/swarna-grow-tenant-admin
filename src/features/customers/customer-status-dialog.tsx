"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import type { Customer } from "@/src/types/domain";
import {
  useBlockCustomerMutation,
  useUnblockCustomerMutation,
  useUpdateCustomerMutation,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";

export function CustomerStatusDialog({
  customer,
  liveActiveSchemes,
  open,
  onOpenChange,
  mode,
}: {
  customer: Customer;
  /** Live enrollments (ACTIVE + LOCKED + DEFAULTED) when known from detail page. */
  liveActiveSchemes?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "deactivate" | "block" | "restore";
}) {
  const [updateCustomer, updateState] = useUpdateCustomerMutation();
  const [blockCustomer, blockState] = useBlockCustomerMutation();
  const [unblockCustomer, unblockState] = useUnblockCustomerMutation();
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [blockAppAccess, setBlockAppAccess] = useState(true);
  const [stopReminders, setStopReminders] = useState(true);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setAcknowledged(false);
    setBlockAppAccess(true);
    setStopReminders(true);
  }, [open, mode, customer.id]);

  const busy =
    updateState.isLoading || blockState.isLoading || unblockState.isLoading;
  const activeSchemes = liveActiveSchemes ?? customer.activeSchemes;
  const canDeactivate =
    mode === "deactivate" && customer.status === "ACTIVE" && activeSchemes === 0;

  const title =
    mode === "restore"
      ? customer.status === "BLOCKED"
        ? "Unblock customer"
        : "Reactivate customer"
      : mode === "block"
        ? "Block customer"
        : "Deactivate customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogScrollShellClass, "sm:max-w-lg")}>
        <DialogBody className="pb-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {customer.name} · {customer.customerNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current status</span>
            <StatusBadge status={customer.status} />
          </div>

          {mode === "deactivate" && customer.status === "ACTIVE" ? (
            <>
              {activeSchemes > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  This customer has {activeSchemes} active scheme
                  {activeSchemes === 1 ? "" : "s"}. Close or transfer them
                  before deactivating.
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Deactivation sets the customer to{" "}
                    <strong>Inactive</strong>. They cannot start new
                    enrollments until reactivated. Existing scheme history stays
                    readable.
                  </p>
                  <div>
                    <FieldLabel>Reason (internal)</FieldLabel>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Why is this customer being deactivated?"
                    />
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={acknowledged}
                      onCheckedChange={(v) => setAcknowledged(v === true)}
                    />
                    <span>
                      I understand inactive customers are hidden from new
                      enrolment flows but retain their passbook history.
                    </span>
                  </label>
                </>
              )}
            </>
          ) : null}

          {mode === "block" && customer.status === "ACTIVE" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Blocking prevents new enrollments and payments, and can revoke
                app access and reminders. The ledger is not altered.
              </p>
              <div>
                <FieldLabel>Block reason</FieldLabel>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Repeated cheque bounce, fraud concern, etc."
                />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={blockAppAccess}
                  onCheckedChange={(v) => setBlockAppAccess(v === true)}
                />
                Revoke customer app access
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={stopReminders}
                  onCheckedChange={(v) => setStopReminders(v === true)}
                />
                Stop WhatsApp reminders
              </label>
            </>
          ) : null}

          {mode === "restore" ? (
            <p className="text-sm text-muted-foreground">
              {customer.status === "BLOCKED"
                ? "Unblocking restores ACTIVE status and re-enables enrollments and payments."
                : "Reactivation restores ACTIVE status so staff can enrol this customer again."}
            </p>
          ) : null}
          </div>
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "deactivate" && customer.status === "ACTIVE" ? (
            <Button
              variant="destructive"
              disabled={!canDeactivate || !acknowledged || !reason.trim() || busy}
              onClick={async () => {
                try {
                  await updateCustomer({
                    id: customer.id,
                    patch: { status: "INACTIVE" },
                  }).unwrap();
                  toast.success(`${customer.name} deactivated`);
                  onOpenChange(false);
                } catch (err: any) {
                  toast.error(
                    err?.data?.message ??
                      "Could not deactivate this customer",
                  );
                }
              }}
            >
              {busy && <Loader2 className="animate-spin" />}
              Deactivate
            </Button>
          ) : null}
          {mode === "block" && customer.status === "ACTIVE" ? (
            <Button
              variant="destructive"
              disabled={!reason.trim() || busy}
              onClick={async () => {
                await blockCustomer({
                  id: customer.id,
                  reason: reason.trim(),
                  blockAppAccess,
                  stopReminders,
                }).unwrap();
                toast.success(`${customer.name} blocked`);
                onOpenChange(false);
              }}
            >
              {busy && <Loader2 className="animate-spin" />}
              Block customer
            </Button>
          ) : null}
          {mode === "restore" ? (
            <Button
              disabled={busy}
              onClick={async () => {
                if (customer.status === "BLOCKED") {
                  await unblockCustomer({ id: customer.id }).unwrap();
                  toast.success(`${customer.name} unblocked`);
                } else {
                  await updateCustomer({
                    id: customer.id,
                    patch: { status: "ACTIVE" },
                  }).unwrap();
                  toast.success(`${customer.name} reactivated`);
                }
                onOpenChange(false);
              }}
            >
              {busy && <Loader2 className="animate-spin" />}
              {customer.status === "BLOCKED" ? "Unblock" : "Reactivate"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
