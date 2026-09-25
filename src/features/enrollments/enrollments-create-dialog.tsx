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
import { Input } from "@/components/ui/input";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  defaultAmountForPlan,
  isFlexibleEnrolPlan,
  resolvedFirstInstallmentMode,
} from "@/src/lib/enrol-plan-rules";
import { idempotencyKey, money } from "@/src/lib/format";
import {
  useCreateEnrollmentMutation,
  useCreatePaymentLinkMutation,
  useGetCustomersQuery,
  useGetPlansQuery,
  useValidateEnrolmentMutation,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { EnrolFirstPaymentAtEnrolment } from "@/src/components/common/enrol-first-payment-at-enrolment";
import {
  DEFAULT_ENROL_FIRST_PAYMENT,
  buildEnrolFirstPaymentRequest,
  enrolFirstPaymentSubmitReady,
  enrolFlexiblePaymentLinkPositionVersion,
  validateEnrolFirstPaymentFields,
} from "@/src/lib/enrol-first-payment";
import { toastApiError } from "@/src/lib/api-error";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  enrolSubmitReady,
  liveEnrolAmountError,
  validateEnrolAmount,
  validateEnrolCustomerId,
  validateEnrolPlanId,
} from "@/src/lib/enrol-form-validation";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { cn } from "@/lib/utils";
import type { SchemePlan } from "@/src/types/domain";

export function EnrollmentsCreateDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const onlinePayments = caps?.onlinePayments !== false;
  const [open, setOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 350);
  const customerSearchError = validateListSearchQuery(customerSearch);
  const customers = useGetCustomersQuery(
    { q: listSearchQueryForApi(debouncedCustomerSearch), limit: 40 },
    {
      skip: !open || shouldSkipListSearchQuery(debouncedCustomerSearch),
    },
  );
  const plans = useGetPlansQuery(undefined, { skip: !open });
  const [createEnrollment] = useCreateEnrollmentMutation();
  const [createPaymentLink] = useCreatePaymentLinkMutation();
  const [validateEnrolment, validateState] = useValidateEnrolmentMutation();

  const activePlans = useMemo(
    () =>
      (plans.data?.items ?? []).filter(
        (x: SchemePlan) => x.status === "ACTIVE",
      ),
    [plans.data?.items],
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customerTouched, setCustomerTouched] = useState(false);
  const [planTouched, setPlanTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    planId: "",
    amount: 0,
    firstInstallmentMode: "COLLECT_NOW" as "COLLECT_NOW" | "START_NEXT_CYCLE",
    ...DEFAULT_ENROL_FIRST_PAYMENT,
  });

  const selectedPlan = activePlans.find(
    (x: SchemePlan) => x.id === form.planId,
  );
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
        ...DEFAULT_ENROL_FIRST_PAYMENT,
      });
      setFieldErrors({});
      setCustomerTouched(false);
      setPlanTouched(false);
      setAmountTouched(false);
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
  const collectNow = effectiveFirstMode === "COLLECT_NOW";

  const displayCustomerError = () =>
    fieldErrors.customerId ??
    (customerTouched ? validateEnrolCustomerId(form.customerId) : undefined);

  const displayPlanError = () =>
    fieldErrors.planId ??
    (planTouched ? validateEnrolPlanId(form.planId) : undefined);

  const displayAmountError = () =>
    fieldErrors.amount ??
    (amountTouched || form.amount > 0
      ? liveEnrolAmountError(selectedPlan, form.amount)
      : undefined);

  return (
    <ActionDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCustomerSearch("");
      }}
      className="max-h-[min(90vh,880px)] w-[calc(100vw-1.5rem)] sm:max-w-[920px]"
      trigger={trigger}
      title="Create enrollment"
      description="Customer, plan and first-installment rules are validated before submission."
      actionLabel="Create enrollment"
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: {
            installmentAmountPaise: "amount",
            customerId: "customerId",
            planId: "planId",
          },
          fallback: "Could not create enrollment",
        });
      }}
      submitDisabled={
        !enrolSubmitReady({
          customerId: form.customerId,
          planId: form.planId,
          plan: selectedPlan,
          amount: debouncedAmount,
          apiBlockers: enrolBlockers,
          validateLoading: validateState.isLoading,
          firstPaymentReady: enrolFirstPaymentSubmitReady(collectNow, {
            firstInstallmentAction: form.firstInstallmentAction,
            paymentMode: form.paymentMode,
            paymentReference: form.paymentReference,
          }),
        })
      }
      onSubmit={async () => {
        setCustomerTouched(true);
        setPlanTouched(true);
        setAmountTouched(true);
        const clientErrors: Record<string, string> = {};
        const customerErr = validateEnrolCustomerId(form.customerId);
        if (customerErr) clientErrors.customerId = customerErr;
        const planErr = validateEnrolPlanId(form.planId);
        if (planErr) clientErrors.planId = planErr;
        const amountErr = validateEnrolAmount(selectedPlan, debouncedAmount);
        if (amountErr) clientErrors.amount = amountErr;
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }
        if (enrolBlockers.length) {
          toast.error(enrolBlockers[0]?.message ?? "Enrolment is blocked.");
          return false;
        }
        const firstPaymentErrors = validateEnrolFirstPaymentFields(collectNow, {
          firstInstallmentAction: form.firstInstallmentAction,
          paymentMode: form.paymentMode,
          paymentReference: form.paymentReference,
        });
        if (Object.keys(firstPaymentErrors).length) {
          setFieldErrors((prev) => ({ ...prev, ...firstPaymentErrors }));
          toast.error("Complete first payment details.");
          return false;
        }
        const flexiblePlan = isFlexibleEnrolPlan(selectedPlan);
        const firstPayment = buildEnrolFirstPaymentRequest(
          collectNow,
          debouncedAmount,
          {
            firstInstallmentAction: form.firstInstallmentAction,
            paymentMode: form.paymentMode,
            paymentReference: form.paymentReference,
          },
          { isFlexiblePlan: flexiblePlan },
        );
        const row = await createEnrollment({
          customerId: form.customerId,
          planId: form.planId,
          amount: debouncedAmount,
          firstInstallmentMode: effectiveFirstMode,
          ...firstPayment,
        }).unwrap();
        if (
          collectNow &&
          form.firstInstallmentAction === "CREATE_PAYMENT_LINK" &&
          onlinePayments
        ) {
          try {
            const link = await createPaymentLink({
              schemeId: row.id,
              amount: debouncedAmount,
              expectedPositionVersion:
                enrolFlexiblePaymentLinkPositionVersion(flexiblePlan),
              idempotencyKey: idempotencyKey(),
            }).unwrap();
            toast.success(
              `${row.enrollmentNo} created · link sent (expires ${link.expiresAt})`,
            );
          } catch (err) {
            toastApiError(
              err,
              `${row.enrollmentNo} created, but payment link failed`,
            );
          }
        } else {
          toast.success(`${row.enrollmentNo} created`);
        }
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
          <Input
            className="mb-2 h-11"
            placeholder="Search name, phone, or passbook no."
            value={customerSearch}
            onChange={(e) =>
              setCustomerSearch(sanitizeListSearchQueryInput(e.target.value))
            }
            aria-invalid={Boolean(customerSearchError)}
          />
          <FormFieldError message={customerSearchError} />
          <Select
            value={form.customerId}
            onValueChange={(value) => {
              setForm({ ...form, customerId: value });
              setCustomerTouched(true);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.customerId;
                return next;
              });
            }}
          >
            <SelectTrigger
              className={cn(
                "h-11 w-full rounded-xl bg-[#faf7f5]",
                displayCustomerError() && "border-red-600",
              )}
              aria-invalid={Boolean(displayCustomerError())}
              onBlur={() => setCustomerTouched(true)}
            >
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
          <FormFieldError message={displayCustomerError()} />
        </div>
        <div>
          <FieldLabel>Scheme plan</FieldLabel>
          <Select
            value={form.planId}
            onValueChange={(value) => {
              const plan = activePlans.find((x: SchemePlan) => x.id === value);
              if (!plan) return;
              setForm({
                ...form,
                planId: value,
                amount: defaultAmountForPlan(plan),
                firstInstallmentMode:
                  plan.firstInstallmentModeDefault ?? "COLLECT_NOW",
              });
              setPlanTouched(true);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.planId;
                delete next.amount;
                return next;
              });
            }}
          >
            <SelectTrigger
              className={cn(
                "h-11 w-full rounded-xl bg-[#faf7f5]",
                displayPlanError() && "border-red-600",
              )}
              aria-invalid={Boolean(displayPlanError())}
              onBlur={() => setPlanTouched(true)}
            >
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((x: SchemePlan) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.name} · {x.tenure} months
                  {x.amountMode === "JEWELLER_FIXED"
                    ? ` · ${money(x.amount)}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError message={displayPlanError()} />
        </div>
        <EnrolAmountControl
          plan={selectedPlan}
          amount={form.amount}
          invalid={Boolean(displayAmountError())}
          onAmountChange={(amount) => {
            setForm({ ...form, amount });
            setAmountTouched(true);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.amount;
              return next;
            });
          }}
        />
        <FormFieldError message={displayAmountError()} />
        <EnrolFirstInstallmentControl
          plan={selectedPlan}
          value={form.firstInstallmentMode}
          onChange={(firstInstallmentMode) =>
            setForm({ ...form, firstInstallmentMode })
          }
        />
        {collectNow ? (
          <EnrolFirstPaymentAtEnrolment
            onlinePayments={onlinePayments}
            value={{
              firstInstallmentAction: form.firstInstallmentAction,
              paymentMode: form.paymentMode,
              paymentReference: form.paymentReference,
            }}
            onChange={(firstPayment) => setForm({ ...form, ...firstPayment })}
            fieldErrors={fieldErrors}
          />
        ) : null}
      </EnrolFormShell>
    </ActionDialog>
  );
}
