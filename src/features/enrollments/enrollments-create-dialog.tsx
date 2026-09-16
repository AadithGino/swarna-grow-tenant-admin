"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { EnrolAmountControl } from "@/src/components/common/enrol-amount-control";
import { EnrolFirstInstallmentControl } from "@/src/components/common/enrol-first-installment-control";
import { EnrolFormShell } from "@/src/components/common/enrol-form-shell";
import { FieldLabel } from "@/src/components/common/page-parts";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  defaultAmountForPlan,
  resolvedFirstInstallmentMode,
} from "@/src/lib/enrol-plan-rules";
import { money } from "@/src/lib/format";
import {
  useCreateEnrollmentMutation,
  useGetCustomersQuery,
  useGetPlansQuery,
  useValidateEnrolmentMutation,
} from "@/src/store/api/admin-api";
import type { SchemePlan } from "@/src/types/domain";

export function EnrollmentsCreateDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const customers = useGetCustomersQuery({}, { skip: !open });
  const plans = useGetPlansQuery(undefined, { skip: !open });
  const [createEnrollment] = useCreateEnrollmentMutation();
  const [validateEnrolment, validateState] = useValidateEnrolmentMutation();

  const activePlans = useMemo(
    () =>
      (plans.data?.items ?? []).filter(
        (x: SchemePlan) => x.status === "ACTIVE",
      ),
    [plans.data?.items],
  );

  const [form, setForm] = useState({
    customerId: "",
    planId: "",
    amount: 0,
    firstInstallmentMode: "COLLECT_NOW" as "COLLECT_NOW" | "START_NEXT_CYCLE",
  });

  const selectedPlan = activePlans.find((x) => x.id === form.planId);
  const effectiveFirstMode = resolvedFirstInstallmentMode(
    selectedPlan,
    form.firstInstallmentMode,
  );
  const debouncedAmount = useDebouncedValue(form.amount, 350);

  useEffect(() => {
    if (!open) {
      setForm({
        customerId: "",
        planId: "",
        amount: 0,
        firstInstallmentMode: "COLLECT_NOW",
      });
    }
  }, [open]);

  const runValidate = useCallback(() => {
    if (!open || !form.customerId || !form.planId) return;
    void validateEnrolment({
      customerId: form.customerId,
      planId: form.planId,
      amount: debouncedAmount,
      firstInstallmentMode: effectiveFirstMode,
    });
  }, [
    open,
    form.customerId,
    form.planId,
    debouncedAmount,
    effectiveFirstMode,
    validateEnrolment,
  ]);

  useEffect(() => {
    runValidate();
  }, [runValidate]);

  const enrolBlockers = validateState.data?.blockers ?? [];

  return (
    <ActionDialog
      open={open}
      onOpenChange={setOpen}
      className="max-h-[min(90vh,880px)] w-[calc(100vw-1.5rem)] sm:max-w-[920px]"
      trigger={trigger}
      title="Create enrollment"
      description="Customer, plan and first-installment rules are validated before submission."
      actionLabel="Create enrollment"
      submitDisabled={
        !form.customerId ||
        !form.planId ||
        validateState.isLoading ||
        enrolBlockers.length > 0
      }
      onSubmit={async () => {
        const row = await createEnrollment({
          customerId: form.customerId,
          planId: form.planId,
          amount: debouncedAmount,
          firstInstallmentMode: effectiveFirstMode,
        }).unwrap();
        toast.success(`${row.enrollmentNo} created`);
        setOpen(false);
        router.push(`/enrollments/${row.id}`);
      }}
    >
      <EnrolFormShell
        validation={validateState.data}
        loading={validateState.isLoading}
      >
        <div>
          <FieldLabel>Customer</FieldLabel>
          <Select
            value={form.customerId}
            onValueChange={(value) =>
              setForm({ ...form, customerId: value })
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl bg-[#faf7f5]">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {(customers.data?.items ?? []).map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.name} · {x.customerNo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Scheme plan</FieldLabel>
          <Select
            value={form.planId}
            onValueChange={(value) => {
              const plan = activePlans.find((x) => x.id === value);
              if (!plan) return;
              setForm({
                ...form,
                planId: value,
                amount: defaultAmountForPlan(plan),
                firstInstallmentMode:
                  plan.firstInstallmentModeDefault ?? "COLLECT_NOW",
              });
            }}
          >
            <SelectTrigger className="h-11 w-full rounded-xl bg-[#faf7f5]">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.name} · {x.tenure} months
                  {x.amountMode === "JEWELLER_FIXED"
                    ? ` · ${money(x.amount)}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <EnrolAmountControl
          plan={selectedPlan}
          amount={form.amount}
          onAmountChange={(amount) => setForm({ ...form, amount })}
        />
        <EnrolFirstInstallmentControl
          plan={selectedPlan}
          value={form.firstInstallmentMode}
          onChange={(firstInstallmentMode) =>
            setForm({ ...form, firstInstallmentMode })
          }
        />
      </EnrolFormShell>
    </ActionDialog>
  );
}
