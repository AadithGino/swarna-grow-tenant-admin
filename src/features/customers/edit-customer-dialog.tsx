"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  customerFormFieldsFromCustomer,
  customerFormReadyForSubmit,
  customerFormUnchanged,
  liveCustomerFieldErrors,
  normalizeCustomerMobileInput,
  validateCustomerForm,
  type CustomerFormFields,
} from "@/src/lib/customer-form";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { cn } from "@/lib/utils";
import type { Customer } from "@/src/types/domain";
import {
  useGetBranchesQuery,
  useUpdateCustomerMutation,
} from "@/src/store/api/admin-api";

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

export function EditCustomerDialog({
  customer,
  trigger,
  open,
  onOpenChange,
}: {
  customer: Customer;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [updateCustomer] = useUpdateCustomerMutation();
  const { data: branchesData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchesData?.items ?? [];
  const [baseline, setBaseline] = useState<CustomerFormFields>(() =>
    customerFormFieldsFromCustomer(customer),
  );
  const [form, setForm] = useState<CustomerFormFields>(() =>
    customerFormFieldsFromCustomer(customer),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [branchTouched, setBranchTouched] = useState(false);

  useEffect(() => {
    const next = customerFormFieldsFromCustomer(customer);
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
    setBranchTouched(false);
  }, [customer]);

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

  const submitDisabled =
    !customerFormReadyForSubmit(form, { requireBranch }) ||
    customerFormUnchanged(form, baseline);

  return (
    <ActionDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title="Edit customer"
      description={`Update profile for ${customer.customerNo}.`}
      actionLabel="Save changes"
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: { mobile: "phone" },
          fallback: "Could not update customer",
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

        await updateCustomer({
          id: customer.id,
          patch: {
            name: form.name.trim(),
            phone,
            email: email || undefined,
            branchId: form.branchId.trim() || undefined,
            address: form.address.trim() || undefined,
            version: customer.version,
          },
        }).unwrap();
        toast.success("Customer profile updated");
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
                {branches.map((branch: { id: string; name: string }) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
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
