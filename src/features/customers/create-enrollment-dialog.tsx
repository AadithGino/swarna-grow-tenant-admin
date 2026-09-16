"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { PageSkeleton } from "@/src/components/common/query-state";
import { money } from "@/src/lib/format";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import { hasCapability } from "@/src/lib/permissions";
import {
  defaultAmountForPlan,
  resolvedFirstInstallmentMode,
} from "@/src/lib/enrol-plan-rules";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useCreateEnrollmentMutation,
  useGetPlansQuery,
  useValidateEnrolmentMutation,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import type { Customer, SchemePlan } from "@/src/types/domain";
import { cn } from "@/lib/utils";

function CreateEnrollmentDialogInner({
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
  const router = useRouter();
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const plansQuery = useGetPlansQuery();
  const activePlans = useMemo(
    () =>
      (plansQuery.data?.items ?? []).filter((x: SchemePlan) => {
        if (x.status !== "ACTIVE") return false;
        if (
          x.paymentPattern === "FLEXIBLE_AVERAGE" &&
          !hasCapability(caps, "flexibleScheme")
        ) {
          return false;
        }
        if (
          x.valueBasis === "GOLD_WEIGHT" &&
          !hasCapability(caps, "goldWeightScheme")
        ) {
          return false;
        }
        return true;
      }),
    [plansQuery.data, caps],
  );
  const onlinePayments = caps?.onlinePayments !== false;
  const [createEnrollment] = useCreateEnrollmentMutation();
  const [form, setForm] = useState({
    planId: "",
    amount: 0,
    firstInstallmentMode: "COLLECT_NOW" as "COLLECT_NOW" | "START_NEXT_CYCLE",
    firstInstallmentAction: "RECORD_MANUAL_PAYMENT" as
      | "RECORD_MANUAL_PAYMENT"
      | "CREATE_PAYMENT_LINK",
  });
  const selectedPlan = activePlans.find((x) => x.id === form.planId);
  const effectiveFirstMode = resolvedFirstInstallmentMode(
    selectedPlan,
    form.firstInstallmentMode,
  );
  const debouncedAmount = useDebouncedValue(form.amount, 350);
  const [validateEnrolment, validateState] = useValidateEnrolmentMutation();

  const runValidate = useCallback(() => {
    if (!selectedPlan || !form.planId) return;
    void validateEnrolment({
      customerId: customer.id,
      planId: form.planId,
      amount: debouncedAmount,
      firstInstallmentMode: effectiveFirstMode,
    });
  }, [
    customer.id,
    debouncedAmount,
    effectiveFirstMode,
    form.planId,
    selectedPlan,
    validateEnrolment,
  ]);

  useEffect(() => {
    if (!open) {
      setForm({
        planId: "",
        amount: 0,
        firstInstallmentMode: "COLLECT_NOW",
        firstInstallmentAction: "RECORD_MANUAL_PAYMENT",
      });
      return;
    }
    runValidate();
  }, [open, form.planId, debouncedAmount, effectiveFirstMode, runValidate]);

  const blockers = validateState.data?.blockers ?? [];

  return (
    <ActionDialog
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      className="max-h-[min(90vh,880px)] w-[calc(100vw-1.5rem)] sm:max-w-[920px]"
      title="Create enrollment"
      description={`Enrol ${customer.name} (${customer.customerNo}) into a scheme plan.`}
      actionLabel="Confirm enrolment"
      submitDisabled={
        !selectedPlan ||
        plansQuery.isLoading ||
        validateState.isLoading ||
        blockers.length > 0
      }
      onSubmit={async () => {
        if (!selectedPlan) return;
        const row = await createEnrollment({
          customerId: customer.id,
          planId: form.planId,
          amount: debouncedAmount,
          firstInstallmentMode: effectiveFirstMode,
          firstInstallmentAction: form.firstInstallmentAction,
        }).unwrap();
        toast.success(`${row.enrollmentNo} created`);
        router.push(`/enrollments/${row.id}`);
      }}
    >
      {plansQuery.isLoading ? (
        <PageSkeleton />
      ) : activePlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active scheme plans are available for enrolment.
        </p>
      ) : (
        <EnrolFormShell
          validation={validateState.data}
          loading={validateState.isLoading}
        >
          <div className="rounded-2xl border border-[#e8dcd8] bg-[#faf7f5] p-4">
            <p className="font-semibold text-[#490b17]">{customer.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.phone} · {customer.branch} · {customer.activeSchemes}{" "}
              active scheme{customer.activeSchemes === 1 ? "" : "s"}
            </p>
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
                <SelectValue placeholder="Choose a plan" />
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
          {selectedPlan?.paymentPattern === "FIXED_DATE" ? (
            <EnrolFirstInstallmentControl
              plan={selectedPlan}
              value={form.firstInstallmentMode}
              onChange={(firstInstallmentMode) =>
                setForm({ ...form, firstInstallmentMode })
              }
            />
          ) : null}
          {effectiveFirstMode === "COLLECT_NOW" ? (
            <div>
              <FieldLabel>First payment at enrolment</FieldLabel>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["RECORD_MANUAL_PAYMENT", "Record manual payment now"] as const,
                    ...(onlinePayments
                      ? ([["CREATE_PAYMENT_LINK", "Send payment link only"]] as const)
                      : []),
                  ] satisfies ReadonlyArray<readonly [string, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-xl border p-3 text-left text-sm transition-colors",
                      form.firstInstallmentAction === value
                        ? "border-[#730321] bg-[#fff5f7]"
                        : "border-[#e3d5d0] hover:border-[#9f6673]",
                    )}
                    onClick={() =>
                      setForm({ ...form, firstInstallmentAction: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </EnrolFormShell>
      )}
    </ActionDialog>
  );
}

export function CreateEnrollmentDialog(
  props: Parameters<typeof CreateEnrollmentDialogInner>[0],
) {
  return (
    <PermissionGate permission={ACTION.schemeEnrol} fallback={null}>
      <CreateEnrollmentDialogInner {...props} />
    </PermissionGate>
  );
}
