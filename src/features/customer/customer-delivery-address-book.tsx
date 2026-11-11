"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { SHOP_HAIRLINE } from "@/src/features/customer/customer-shop-ui";

export type DeliveryAddressFormState = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  recipientName: string;
  mobile: string;
  label: string;
};

export const emptyDeliveryAddressForm = (): DeliveryAddressFormState => ({
  line1: "",
  line2: "",
  city: "",
  state: "Kerala",
  pincode: "",
  recipientName: "",
  mobile: "",
  label: "Home",
});

export function deliveryAddressToForm(row: Record<string, unknown>): DeliveryAddressFormState {
  return {
    line1: String(row.line1 ?? ""),
    line2: String(row.line2 ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? "Kerala"),
    pincode: String(row.pincode ?? ""),
    recipientName: String(row.recipientName ?? ""),
    mobile: String(row.mobile ?? ""),
    label: String(row.label ?? "Home"),
  };
}

export function formatDeliveryAddressDetail(row: Record<string, unknown>) {
  return [row.recipientName, row.line1, row.line2, [row.city, row.state, row.pincode].filter(Boolean).join(", ")]
    .filter(Boolean)
    .map(String)
    .join(" · ");
}

export function DeliveryAddressFormFields({
  form,
  setForm,
  idPrefix,
  showLabel,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  form: DeliveryAddressFormState;
  setForm: React.Dispatch<React.SetStateAction<DeliveryAddressFormState>>;
  idPrefix: string;
  showLabel?: boolean;
  busy?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={cn("mt-3 grid gap-3 rounded-2xl border bg-[#fcfaf8] p-4 sm:grid-cols-2", SHOP_HAIRLINE)}>
      {showLabel ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-label`}>Label</Label>
          <Input
            id={`${idPrefix}-label`}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="h-11 rounded-xl bg-white"
            placeholder="Home, Office…"
          />
        </div>
      ) : null}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line1`}>House, street and area</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={form.line1}
          onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
          className="h-11 rounded-xl bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Recipient name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.recipientName}
          onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
          className="h-11 rounded-xl bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-mobile`}>Mobile</Label>
        <Input
          id={`${idPrefix}-mobile`}
          inputMode="tel"
          value={form.mobile}
          onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
          className="h-11 rounded-xl bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          className="h-11 rounded-xl bg-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="h-11 rounded-xl bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-pin`}>Pincode</Label>
          <Input
            id={`${idPrefix}-pin`}
            inputMode="numeric"
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
            className="h-11 rounded-xl bg-white"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button
          type="button"
          className="h-10 rounded-full px-5 text-white"
          style={customerBrandStyle.primaryBg}
          disabled={busy}
          onClick={onSubmit}
        >
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" className="h-10 rounded-full" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DeliveryAddressCardActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--customer-primary,#730321)] hover:bg-[#f6edf0]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
      >
        <Pencil className="size-3" />
        Edit
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-3" />
        Delete
      </button>
    </span>
  );
}

export function DeleteDeliveryAddressDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete address?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the address from your saved book for shop delivery and digital gold redemption.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={busy} className="rounded-xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="rounded-xl border-0 bg-red-600 font-bold text-white hover:bg-red-700"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
