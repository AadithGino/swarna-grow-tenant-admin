"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  NomineeMobileInput,
  NomineeNameInput,
  NomineeNotesInput,
} from "@/src/components/form/nominee-form-inputs";
import { normalizeCustomerMobileInput } from "@/src/lib/customer-form";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { toastApiError } from "@/src/lib/api-error";
import {
  clearNomineeFieldError,
  liveNomineeFieldErrors,
  nomineeFormFieldsFromDetail,
  nomineeFormReadyForSubmit,
  nomineeFormUnchanged,
  validateNomineeForm,
  type NomineeFormFields,
} from "@/src/lib/nominee-form";
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

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState<NomineeFormFields>(() =>
    nomineeFormFieldsFromDetail(customer.nomineeDetail),
  );
  const [form, setForm] = useState<NomineeFormFields>(() =>
    nomineeFormFieldsFromDetail(customer.nomineeDetail),
  );

  useEffect(() => {
    const next = nomineeFormFieldsFromDetail(customer.nomineeDetail);
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
  }, [customer, open]);

  const hasNominee = Boolean(customer.nomineeDetail);

  const liveErrors = useMemo(() => liveNomineeFieldErrors(form), [form]);

  const displayError = (field: keyof NomineeFormFields) =>
    mergeFieldMessage(fieldErrors[field], liveErrors[field]);

  const setField = <K extends keyof NomineeFormFields>(
    key: K,
    value: NomineeFormFields[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => clearNomineeFieldError(prev, key));
  };

  const submitDisabled =
    !nomineeFormReadyForSubmit(form) ||
    (hasNominee && nomineeFormUnchanged(form, baseline));

  return (
    <>
      <ActionDialog
        open={open}
        onOpenChange={onOpenChange}
        className="sm:max-w-lg"
        title={hasNominee ? "Manage nominee" : "Add nominee"}
        description="One optional nominee per customer — name, relationship, mobile and notes only."
        actionLabel={hasNominee ? "Save nominee" : "Add nominee"}
        submitDisabled={submitDisabled}
        suppressDefaultErrorToast
        onError={(err) => {
          handleFormApiError(err, {
            setFieldErrors,
            fallback: "Could not save nominee",
          });
        }}
        onSubmit={async () => {
          const clientErrors = validateNomineeForm(form);
          if (Object.keys(clientErrors).length) {
            setFieldErrors(clientErrors);
            toast.error("Fix the highlighted fields.");
            return false;
          }
          const mobile = normalizeCustomerMobileInput(form.mobile);
          await updateNominee({
            id: customer.id,
            expectedVersion: customer.version,
            name: form.name.trim(),
            relationship: form.relationship,
            mobile,
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
          <NomineeNameInput
            value={form.name}
            onChange={(value) => setField("name", value)}
            error={displayError("name")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Relationship</FieldLabel>
              <Select
                value={form.relationship}
                onValueChange={(value) =>
                  setField("relationship", value as NomineeRelationship)
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
            <NomineeMobileInput
              value={form.mobile}
              onChange={(value) => setField("mobile", value)}
              error={displayError("mobile")}
            />
          </div>
          <NomineeNotesInput
            value={form.notes}
            onChange={(value) => setField("notes", value)}
            error={displayError("notes")}
          />
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
                try {
                  await removeNominee({
                    id: customer.id,
                    expectedVersion: customer.version,
                  }).unwrap();
                  toast.success("Nominee removed");
                  setConfirmRemove(false);
                  onOpenChange(false);
                } catch (err) {
                  toastApiError(err, "Could not remove nominee");
                }
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
