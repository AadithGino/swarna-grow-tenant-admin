"use client";

import { ActionDialog } from "@/src/components/common/action-dialog";
import { formatOrderInr } from "@/src/lib/ecommerce-order-presenters";

export function EcommerceOrderFinancialReviewDialog({
  open,
  onOpenChange,
  title,
  amountPaise,
  recipient,
  consequence,
  permissionNote,
  actionLabel,
  onConfirm,
  submitDisabled,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amountPaise: number;
  recipient?: string;
  consequence: string;
  permissionNote: string;
  actionLabel: string;
  onConfirm: () => Promise<void>;
  submitDisabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Review before recording money movement. This is audited."
      actionLabel={actionLabel}
      submitDisabled={submitDisabled}
      onSubmit={onConfirm}
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="font-semibold text-amber-950">{formatOrderInr(amountPaise)}</p>
          {recipient ? <p className="text-amber-900">Recipient: {recipient}</p> : null}
        </div>
        <p className="text-muted-foreground">{consequence}</p>
        <p className="text-xs text-muted-foreground">{permissionNote}</p>
        {children}
      </div>
    </ActionDialog>
  );
}
