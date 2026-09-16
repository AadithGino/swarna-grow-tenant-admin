"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import type { Customer, NomineeRelationship } from "@/src/types/domain";
import {
  useRemoveCustomerNomineeMutation,
  useUpdateCustomerNomineeMutation,
} from "@/src/store/api/admin-api";

const RELATIONSHIPS: { value: NomineeRelationship; label: string }[] = [
  { value: "SPOUSE", label: "Spouse" },
  { value: "PARENT", label: "Parent" },
  { value: "CHILD", label: "Child" },
  { value: "SIBLING", label: "Sibling" },
  { value: "RELATIVE", label: "Relative" },
  { value: "FRIEND", label: "Friend" },
  { value: "OTHER", label: "Other" },
];

export function ManageNomineeDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [updateNominee] = useUpdateCustomerNomineeMutation();
  const [removeNominee, removeState] = useRemoveCustomerNomineeMutation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [form, setForm] = useState({
    name: "",
    relationship: "SPOUSE" as NomineeRelationship,
    mobile: "",
    notes: "",
  });

  useEffect(() => {
    const n = customer.nomineeDetail;
    setForm({
      name: n?.name ?? "",
      relationship: n?.relationship ?? "SPOUSE",
      mobile: n?.mobile ?? "",
      notes: n?.notes ?? "",
    });
  }, [customer, open]);

  const hasNominee = Boolean(customer.nomineeDetail);

  return (
    <>
      <ActionDialog
        open={open}
        onOpenChange={onOpenChange}
        className="sm:max-w-lg"
        title={hasNominee ? "Manage nominee" : "Add nominee"}
        description="One optional nominee per customer — name, relationship, mobile and notes only."
        actionLabel={hasNominee ? "Save nominee" : "Add nominee"}
        onSubmit={async () => {
          if (form.name.trim().length < 2 || !form.mobile.trim()) {
            toast.error("Name and mobile are required");
            throw new Error("validation");
          }
          await updateNominee({
            id: customer.id,
            expectedVersion: customer.version,
            name: form.name.trim(),
            relationship: form.relationship,
            mobile: form.mobile.trim(),
            notes: form.notes.trim() || undefined,
          }).unwrap();
          toast.success(hasNominee ? "Nominee updated" : "Nominee added");
        }}
      >
        <div className="space-y-4">
          {customer.nomineeDetail?.updatedAt ? (
            <p className="text-sm text-muted-foreground">
              Last updated by {customer.nomineeDetail.updatedBy ?? "staff"} on{" "}
              {customer.nomineeDetail.updatedAt}
            </p>
          ) : null}
          <div>
            <FieldLabel>Full name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Relationship</FieldLabel>
              <Select
                value={form.relationship}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    relationship: value as NomineeRelationship,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Mobile</FieldLabel>
              <Input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                inputMode="tel"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Operational contact note only"
            />
          </div>
          {hasNominee ? (
            <Button
              type="button"
              variant="outline"
              className="w-full text-red-600"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 />
              Remove nominee
            </Button>
          ) : null}
        </div>
      </ActionDialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove nominee?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the nominee on {customer.name}&apos;s record. Existing
              schemes are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={removeState.isLoading}
              onClick={async (e) => {
                e.preventDefault();
                await removeNominee({
                  id: customer.id,
                  expectedVersion: customer.version,
                }).unwrap();
                toast.success("Nominee removed");
                setConfirmRemove(false);
                onOpenChange(false);
              }}
            >
              {removeState.isLoading && <Loader2 className="animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
