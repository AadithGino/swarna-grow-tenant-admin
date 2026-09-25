"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  CustomerAddressInput,
  CustomerEmailInput,
  CustomerNameInput,
  CustomerPhoneInput,
} from "@/src/components/form/customer-form-inputs";
import {
  clearCustomerFieldError,
  customerFormReadyForSubmit,
  liveCustomerFieldErrors,
  normalizeCustomerMobileInput,
  validateCustomerForm,
  type CustomerFormFields,
} from "@/src/lib/customer-form";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { cn } from "@/lib/utils";
import { useCreateCustomerMutation } from "@/src/store/api/admin-api";

const emptyForm = (): CustomerFormFields => ({
  name: "",
  phone: "",
  email: "",
  branchId: "",
  address: "",
});

type BranchOption = { id: string; name: string };

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

export function CreateCustomerDialog({
  branches,
}: {
  branches: BranchOption[];
}) {
  const [createCustomer] = useCreateCustomerMutation();
  const [form, setForm] = useState<CustomerFormFields>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [branchTouched, setBranchTouched] = useState(false);

  const requireBranch = branches.length > 0;

  const liveErrors = useMemo(
    () =>
      liveCustomerFieldErrors(form, {
        requireBranch,
        branchTouched,
      }),
    [form, requireBranch, branchTouched],
  );

  const displayError = (field: keyof CustomerFormFields) =>
    mergeFieldMessage(fieldErrors[field], liveErrors[field]);

  const setField = <K extends keyof CustomerFormFields>(
    key: K,
    value: CustomerFormFields[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => clearCustomerFieldError(prev, key));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setFieldErrors({});
    setBranchTouched(false);
  };

  const submitDisabled = !customerFormReadyForSubmit(form, { requireBranch });

  return (
    <ActionDialog
      trigger={
        <Button>
          <Plus />
          Create customer
        </Button>
      }
      title="Create customer"
      description="Mobile must be unique in your tenant. Leave email blank if the customer has none."
      actionLabel="Create customer"
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onOpenChange={(open) => {
        if (!open) resetForm();
      }}
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: { mobile: "phone" },
          fallback: "Could not create customer",
        });
      }}
      onSubmit={async () => {
        setBranchTouched(true);
        const clientErrors = validateCustomerForm(form, { requireBranch });
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }

        const phone = normalizeCustomerMobileInput(form.phone);
        const email = form.email.trim();

        const created = await createCustomer({
          name: form.name.trim(),
          phone,
          email: email || undefined,
          branchId: form.branchId.trim() || undefined,
          address: form.address.trim(),
        }).unwrap();

        toast.success(`${created.name} created`);
        resetForm();
      }}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomerNameInput
            value={form.name}
            onChange={(value) => setField("name", value)}
            error={displayError("name")}
          />
          <CustomerPhoneInput
            value={form.phone}
            onChange={(value) => setField("phone", value)}
            error={displayError("phone")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CustomerEmailInput
            value={form.email}
            onChange={(value) => setField("email", value)}
            error={displayError("email")}
          />
          <div>
            <FieldLabel>
              Primary branch{requireBranch ? "" : " (optional)"}
            </FieldLabel>
            <Select
              value={form.branchId || undefined}
              onValueChange={(value) => {
                setField("branchId", value);
                setBranchTouched(true);
              }}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  displayError("branchId") && "border-red-600",
                )}
                aria-invalid={Boolean(displayError("branchId"))}
                onBlur={() => setBranchTouched(true)}
              >
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormFieldError message={displayError("branchId")} />
          </div>
        </div>
        <CustomerAddressInput
          value={form.address}
          onChange={(value) => setField("address", value)}
          error={displayError("address")}
        />
      </div>
    </ActionDialog>
  );
}
