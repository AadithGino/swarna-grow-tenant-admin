"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NomineeMobileInput,
  NomineeNameInput,
  NomineeNotesInput,
} from "@/src/components/form/nominee-form-inputs";
import { normalizeCustomerMobileInput } from "@/src/lib/customer-form";
import {
  nomineeFormFieldsFromDetail,
  nomineeFormReadyForSubmit,
  nomineeFormUnchanged,
  validateNomineeForm,
  type NomineeFormFields,
} from "@/src/lib/nominee-form";
import type { CustomerProfile } from "@/src/types/customer";
import type { NomineeRelationship } from "@/src/types/domain";
import {
  useRemoveCustomerNomineeMutation,
  useUpdateCustomerNomineeMutation,
} from "@/src/store/api/customer-api";

const RELATIONSHIPS: { value: NomineeRelationship; label: string }[] = [
  { value: "SPOUSE", label: "Spouse" },
  { value: "PARENT", label: "Parent" },
  { value: "CHILD", label: "Child" },
  { value: "SIBLING", label: "Sibling" },
  { value: "RELATIVE", label: "Relative" },
  { value: "FRIEND", label: "Friend" },
  { value: "OTHER", label: "Other" },
];

function profileToNomineeDetail(profile: CustomerProfile) {
  if (!profile.nominee) return null;
  return {
    name: profile.nominee.name,
    relationship: profile.nominee.relationship as NomineeRelationship,
    mobile: profile.nominee.mobile,
    notes: profile.nominee.notes ?? undefined,
  };
}

export function CustomerNomineeDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: CustomerProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [updateNominee, updateState] = useUpdateCustomerNomineeMutation();
  const [removeNominee, removeState] = useRemoveCustomerNomineeMutation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const detail = profileToNomineeDetail(profile);
  const hasNominee = Boolean(profile.nominee?.name);
  const [baseline] = useState<NomineeFormFields>(() => nomineeFormFieldsFromDetail(detail));
  const [form, setForm] = useState<NomineeFormFields>(() => nomineeFormFieldsFromDetail(detail));

  const submitDisabled =
    !nomineeFormReadyForSubmit(form) ||
    updateState.isLoading ||
    (hasNominee && nomineeFormUnchanged(form, baseline));

  const setField = (key: keyof NomineeFormFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const save = async () => {
    const clientErrors = validateNomineeForm(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      toast.error("Fix the highlighted fields.");
      return;
    }
    try {
      await updateNominee({
        expectedVersion: profile.version!,
        name: form.name.trim(),
        relationship: form.relationship,
        mobile: normalizeCustomerMobileInput(form.mobile),
        notes: form.notes.trim() || undefined,
      }).unwrap();
      toast.success(hasNominee ? "Nominee updated" : "Nominee added");
      onOpenChange(false);
    } catch {
      toast.error("Could not save nominee");
    }
  };

  const remove = async () => {
    try {
      await removeNominee({ expectedVersion: profile.version! }).unwrap();
      toast.success("Nominee removed");
      setConfirmRemove(false);
      onOpenChange(false);
    } catch {
      toast.error("Could not remove nominee");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{hasNominee ? "Update nominee" : "Add nominee"}</DialogTitle>
            <DialogDescription>Optional nominee for your savings account with this jeweller.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <NomineeNameInput
              value={form.name}
              onChange={(value) => setField("name", value)}
              error={fieldErrors.name}
            />
            <div>
              <label className="text-sm font-medium">Relationship</label>
              <Select value={form.relationship} onValueChange={(v) => setField("relationship", v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NomineeMobileInput
              value={form.mobile}
              onChange={(value) => setField("mobile", value)}
              error={fieldErrors.mobile}
            />
            <NomineeNotesInput
              value={form.notes}
              onChange={(value) => setField("notes", value)}
              error={fieldErrors.notes}
            />
            <Button
              disabled={submitDisabled}
              onClick={save}
              className="w-full rounded-xl bg-[#730321]"
            >
              {updateState.isLoading ? <Loader2 className="animate-spin" /> : hasNominee ? "Save nominee" : "Add nominee"}
            </Button>
            {hasNominee ? (
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive"
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2 className="size-4" />
                Remove nominee
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove nominee?</AlertDialogTitle>
            <AlertDialogDescription>This clears the nominee on your customer record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={removeState.isLoading} onClick={remove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
