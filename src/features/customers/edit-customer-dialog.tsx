"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import type { Customer } from "@/src/types/domain";
import {
  useGetBranchesQuery,
  useUpdateCustomerMutation,
} from "@/src/store/api/admin-api";

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
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    branchId: customer.branchId || "",
    address: customer.address,
  });

  useEffect(() => {
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      branchId: customer.branchId || "",
      address: customer.address,
    });
  }, [customer]);

  return (
    <ActionDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      title="Edit customer"
      description={`Update profile for ${customer.customerNo}.`}
      actionLabel="Save changes"
      onSubmit={async () => {
        if (!form.name.trim() || !form.phone.trim()) {
          toast.error("Name and mobile number are required");
          throw new Error("validation");
        }
        await updateCustomer({
          id: customer.id,
          patch: {
            name: form.name,
            phone: form.phone,
            email: form.email,
            branchId: form.branchId || undefined,
            address: form.address,
            version: customer.version,
          },
        }).unwrap();
        toast.success("Customer profile updated");
      }}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Mobile number</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="tel"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Primary branch</FieldLabel>
            <Select
              value={form.branchId || undefined}
              onValueChange={(value) => setForm({ ...form, branchId: value })}
            >
              <SelectTrigger className="w-full">
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
          </div>
        </div>
        <div>
          <FieldLabel>Address</FieldLabel>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
      </div>
    </ActionDialog>
  );
}
