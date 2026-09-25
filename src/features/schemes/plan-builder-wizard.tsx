"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  FieldLabel,
  PageHeader,
  Surface,
} from "@/src/components/common/page-parts";
import { parseApiError } from "@/src/lib/api-error";
import { flexiblePhaseTargetMonths } from "@/src/lib/flexible-plan-phase-target";
import {
  validatePlanBuilderFull,
  validatePlanBuilderStep,
} from "@/src/lib/plan-builder-validation";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useCreatePlanMutation,
  useGetBranchesQuery,
  useGetPlanQuery,
  usePatchPlanMutation,
  usePreviewPlanScheduleMutation,
} from "@/src/store/api/admin-api";
import { PlanSchedulePreviewPanel } from "@/src/features/schemes/plan-preview-panel";
import {
  AmountSummaryStrip,
  ChoiceCard,
  FieldHint,
  FlexiblePhaseTimeline,
  FormSection,
  FreeWindowPaymentLimits,
  PlanBuilderCustomerPreview,
  PlanBuilderStepper,
  ReviewSummaryCard,
  STEP_COPY,
  StepIntro,
} from "@/src/features/schemes/plan-builder-ui";
import type { StepId } from "@/src/features/schemes/plan-builder-wizard-types";
import { useAppSelector } from "@/src/store/hooks";
import {
  allowedBenefitTypes,
  amountSummaryLabel,
  benefitSummaryLabel,
  buildPlanCreatePayload,
  buildPlanPatchPayload,
  buildPreviewScheduleBody,
  coerceBenefitForPattern,
  defaultPlanBuilderForm,
  isPlanPreviewReady,
  planPreviewInputKey,
  paymentPatternLabel,
  penaltyModeLabel,
  planDetailToDuplicateForm,
  planDetailToForm,
  redemptionModesLabel,
  valueBasisLabel,
  type PlanBuilderFormState,
  type RedemptionMode,
} from "@/src/features/schemes/plan-builder-form";

const REDEMPTION_MODE_OPTIONS: { id: RedemptionMode; label: string }[] = [
  { id: "CASH", label: "Cash settlement" },
  { id: "GOLD_HANDOVER", label: "Gold handover" },
  { id: "PURCHASE_ADJUSTMENT", label: "Purchase adjustment" },
];

function buildSteps(paymentPattern: string): { id: StepId; label: string }[] {
  const steps: { id: StepId; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "type", label: "Type" },
    { id: "duration", label: "Duration" },
  ];
  if (paymentPattern === "FIXED_DATE") {
    steps.push({ id: "amount", label: "Amount rules" });
    steps.push({ id: "schedule", label: "Schedule & payments" });
  }
  if (paymentPattern === "FLEXIBLE_AVERAGE") {
    steps.push({ id: "flexible", label: "Flexible rules" });
  }
  steps.push(
    { id: "benefit", label: "Benefit" },
    { id: "redemption", label: "Redemption" },
    { id: "availability", label: "Availability" },
    { id: "review", label: "Review" },
  );
  return steps;
}

function ToggleRow({
  label,
  detail,
  checked,
  onCheckedChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <div>
        <strong className="text-sm">{label}</strong>
        {detail ? (
          <p className="text-sm text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

const LOCKED_FINANCIAL_STEPS: StepId[] = [
  "type",
  "duration",
  "amount",
  "schedule",
  "flexible",
  "redemption",
];

export function PlanBuilderWizard({
  planId,
  duplicateFromPlanId,
}: {
  planId?: string;
  /** Load source plan into the builder without creating a draft until save. */
  duplicateFromPlanId?: string;
}) {
  const router = useRouter();
  const isDuplicate = Boolean(duplicateFromPlanId);
  const isEdit = Boolean(planId) && !isDuplicate;
  const loadPlanId = isDuplicate ? duplicateFromPlanId! : planId;
  const planQuery = useGetPlanQuery(loadPlanId!, { skip: !loadPlanId });
  const [stepIndex, setStepIndex] = useState(0);
  const [createPlan] = useCreatePlanMutation();
  const [patchPlan] = usePatchPlanMutation();
  const [previewSchedule, previewState] = usePreviewPlanScheduleMutation();
  const branchesQuery = useGetBranchesQuery({ limit: 100 });
  const branches = branchesQuery.data?.items ?? [];
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const [form, setForm] = useState<PlanBuilderFormState>(defaultPlanBuilderForm);
  const [hydrated, setHydrated] = useState(!loadPlanId);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState<string | undefined>();

  useEffect(() => {
    if (!planQuery.data || hydrated) return;
    const detail = planQuery.data as Record<string, unknown>;
    setForm(
      coerceBenefitForPattern(
        isDuplicate ? planDetailToDuplicateForm(detail) : planDetailToForm(detail),
      ),
    );
    setHydrated(true);
  }, [planQuery.data, hydrated, isDuplicate]);

  const set = (patch: Partial<PlanBuilderFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    const keys = Object.keys(patch);
    if (keys.length) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of keys) delete next[key];
        return next;
      });
    }
  };

  const steps = useMemo(
    () => buildSteps(form.paymentPattern),
    [form.paymentPattern],
  );

  useEffect(() => {
    setStepIndex((i) => {
      const id = steps[i]?.id;
      if (id) {
        const same = steps.findIndex((s) => s.id === id);
        if (same >= 0) return same;
        if (id === "amount") {
          const flex = steps.findIndex((s) => s.id === "flexible");
          if (flex >= 0) return flex;
        }
        if (id === "flexible") {
          const amount = steps.findIndex((s) => s.id === "amount");
          if (amount >= 0) return amount;
        }
      }
      return Math.min(i, Math.max(0, steps.length - 1));
    });
  }, [steps]);

  const current = steps[stepIndex] ?? steps[0];

  const go = (delta: number) =>
    setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));

  const onPreview = async (opts?: { silent?: boolean }) => {
    try {
      await previewSchedule(
        buildPreviewScheduleBody(form, { planId: isEdit ? planId : undefined }),
      ).unwrap();
      setPreviewError(undefined);
    } catch (err) {
      const message = parseApiError(
        err,
        "Could not load schedule preview. Check amount and duration.",
      ).message;
      setPreviewError(message);
      if (!opts?.silent) {
        toast.error(message);
      }
    }
  };

  const previewInputKey = planPreviewInputKey(form);
  const gateStepIndex =
    form.paymentPattern === "FLEXIBLE_AVERAGE"
      ? steps.findIndex((s) => s.id === "flexible")
      : steps.findIndex((s) => s.id === "amount");
  const previewFetchAllowed =
    isEdit ||
    (gateStepIndex >= 0 &&
      stepIndex >= gateStepIndex &&
      isPlanPreviewReady(form));

  useEffect(() => {
    if (!hydrated || !previewFetchAllowed) return;
    const timer = window.setTimeout(() => {
      void onPreview({ silent: true });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by previewInputKey
  }, [hydrated, previewFetchAllowed, previewInputKey, planId]);

  if (loadPlanId && planQuery.isLoading) return <PageSkeleton />;
  if (loadPlanId && (planQuery.isError || !planQuery.data))
    return <QueryError error={planQuery.error} onRetry={planQuery.refetch} />;

  const financialLocked =
    form.editLocked &&
    LOCKED_FINANCIAL_STEPS.includes(current.id) &&
    current.id !== "benefit";

  const toggleRedemptionMode = (mode: RedemptionMode) => {
    setForm((prev) => {
      const has = prev.allowedRedemptionModes.includes(mode);
      return {
        ...prev,
        allowedRedemptionModes: has
          ? prev.allowedRedemptionModes.filter((m) => m !== mode)
          : [...prev.allowedRedemptionModes, mode],
      };
    });
  };

  const stepCopy = STEP_COPY[current.id];
  const totalFlexibleMonths = form.flexiblePhaseCycles + form.cappedPhaseCycles;
  const capUsesPaymentCount =
    form.capFormula === "FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT";
  const averageDivisor = capUsesPaymentCount
    ? Math.max(1, form.flexiblePhaseCycles)
    : Math.max(1, form.averagingDivisor);
  const roundToNearest = Math.max(1, form.capRoundToNearest);
  const exampleFreeTotal = Math.max(
    form.flexMinTotal,
    form.flexMinPayment * Math.max(1, form.flexiblePhaseCycles),
  );
  const rawCap = exampleFreeTotal / averageDivisor;
  const roundedCap = Math.ceil(rawCap / roundToNearest) * roundToNearest;
  const projectedCap = Math.max(
    form.capMinCycle,
    Math.min(form.capMaxCycle, roundedCap),
  );
  const flexiblePaymentMonths = flexiblePhaseTargetMonths(form);
  const splitMatchesPaymentMonths =
    totalFlexibleMonths === flexiblePaymentMonths;
  const freeBoundsValid =
    form.flexMinPayment > 0 && form.flexMaxPayment >= form.flexMinPayment;
  const capBandValid = form.capMinCycle > 0 && form.capMaxCycle >= form.capMinCycle;
  const collectionValid = form.cappedMinPayment > 0;

  return (
    <>
      <PageHeader
        eyebrow="Scheme plans"
        title={
          isEdit
            ? "Edit scheme plan"
            : isDuplicate
              ? "Duplicate scheme plan"
              : "New scheme plan"
        }
        description={
          isEdit
            ? `Update ${form.name || "plan"} · code ${form.code || "—"}`
            : isDuplicate
              ? "Copied from the source plan — nothing is saved until you create a draft."
              : "Build a draft plan step by step — preview updates as you go."
        }
        actions={
          <Button variant="outline" onClick={() => router.push("/schemes")}>
            Exit
          </Button>
        }
      />
      <PlanBuilderStepper
        steps={steps}
        currentIndex={stepIndex}
        onSelect={setStepIndex}
      />
      {form.editLocked ? (
        <Surface className="mb-4 border-amber-200 bg-amber-50">
          <p className="p-4 text-sm text-amber-950">
            Active schemes use this plan. Financial fields are locked — duplicate
            the plan to change rules.
          </p>
        </Surface>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(280px,340px)]">
        <Surface title={stepCopy.title} description={stepCopy.description}>
          <fieldset
            disabled={financialLocked}
            className="space-y-5 p-6 disabled:opacity-60"
          >
            <StepIntro stepId={current.id} />
            {financialLocked && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Financial rules are locked while schemes are active. Update
                profile, benefit label, and availability, or duplicate the plan.
              </p>
            )}
            {current.id === "basics" && (
              <FormSection title="Identity & copy">
                <FieldLabel>Plan name</FieldLabel>
                <FieldHint>Internal name — shown in admin lists and reports.</FieldHint>
                <Input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  className={cn(fieldErrors.name && "border-red-600")}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                <FormFieldError message={fieldErrors.name} />
                <FieldLabel>Plan code</FieldLabel>
                <FieldHint>Short unique code (e.g. DH11). Cannot change after save.</FieldHint>
                <Input
                  value={form.code}
                  disabled={isEdit}
                  onChange={(e) =>
                    set({ code: e.target.value.toUpperCase() })
                  }
                  className={cn(fieldErrors.code && "border-red-600")}
                  aria-invalid={Boolean(fieldErrors.code)}
                />
                <FormFieldError message={fieldErrors.code} />
                <FieldLabel>Display name</FieldLabel>
                <FieldHint>Title on the customer app scheme card.</FieldHint>
                <Input
                  value={form.displayName}
                  onChange={(e) => set({ displayName: e.target.value })}
                  placeholder={form.name || "Shown in customer app"}
                />
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
                <FieldLabel>Terms & conditions</FieldLabel>
                <FieldHint>Shown at enrolment — keep bullets short and clear.</FieldHint>
                <Textarea
                  rows={4}
                  value={form.termsText}
                  onChange={(e) => set({ termsText: e.target.value })}
                />
              </FormSection>
            )}

            {current.id === "type" && (
              <>
                <FormSection
                  title="Value basis"
                  hint="How maturity value is measured and shown to the customer."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      selected={form.valueBasis === "CASH"}
                      title="Cash"
                      description="Fixed rupee installments or ranges. Simple for traditional chit-style savings."
                      onClick={() => set({ valueBasis: "CASH" })}
                    />
                    <PermissionGate capability="goldWeightScheme">
                      <ChoiceCard
                        selected={form.valueBasis === "GOLD_WEIGHT"}
                        title="Gold weight"
                        description="Payments convert to grams at your daily rate. Ideal for gold accumulation schemes."
                        onClick={() => set({ valueBasis: "GOLD_WEIGHT" })}
                      />
                    </PermissionGate>
                  </div>
                </FormSection>
                {form.valueBasis === "GOLD_WEIGHT" && (
                  <FormSection title="Gold rate safety" tone="wine">
                    <ToggleRow
                      label="Block payments if gold rate not set"
                      detail="Staff cannot record payments until today's rate is published."
                      checked={form.blockPaymentIfRateNotSet}
                      onCheckedChange={(v) =>
                        set({ blockPaymentIfRateNotSet: v })
                      }
                    />
                  </FormSection>
                )}
                <FormSection
                  title="Payment pattern"
                  hint="Fixed plans use equal installments on due dates. Flexible plans use a free window then capped months."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      selected={form.paymentPattern === "FIXED_DATE"}
                      title="Fixed installments"
                      description="Same due date each month (e.g. 11+1). Best for predictable collection."
                      onClick={() =>
                        set(
                          coerceBenefitForPattern({
                            ...form,
                            paymentPattern: "FIXED_DATE",
                          }),
                        )
                      }
                    />
                    {caps?.flexibleScheme ? (
                      <ChoiceCard
                        selected={form.paymentPattern === "FLEXIBLE_AVERAGE"}
                        title="Flexible then capped"
                        description="Variable pay-in period, then monthly caps from the customer average."
                        onClick={() =>
                          set(
                            coerceBenefitForPattern({
                              ...form,
                              paymentPattern: "FLEXIBLE_AVERAGE",
                            }),
                          )
                        }
                      />
                    ) : (
                      <ChoiceCard
                        selected={false}
                        title="Flexible (upgrade)"
                        description="Growth tier and above. Open Subscription to request an upgrade and enable flexible schemes."
                        onClick={() =>
                          router.push("/settings/subscription?interest=flexible")
                        }
                      />
                    )}
                  </div>
                </FormSection>
              </>
            )}

            {current.id === "duration" && (
              <FormSection
                title="Scheme length"
                hint="Duration is calendar tenure to maturity. Installment count is how many payment periods you schedule (e.g. 12 months duration, 11 installments for a free final month)."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Duration (months)</FieldLabel>
                    <FieldHint>Maturity calendar — scheme becomes MATURED after this many months.</FieldHint>
                    <Input
                      type="number"
                      min={1}
                      value={form.durationMonths}
                      onChange={(e) =>
                        set({ durationMonths: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Installment count</FieldLabel>
                    <FieldHint>
                      Number of collection periods (installments or cycles).
                    </FieldHint>
                    <Input
                      type="number"
                      min={1}
                      value={form.installmentCount}
                      onChange={(e) =>
                        set({ installmentCount: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                {form.paymentPattern === "FLEXIBLE_AVERAGE" &&
                form.flexiblePhaseCycles + form.cappedPhaseCycles !==
                  flexiblePaymentMonths ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Tip: free + capped months (
                    {form.flexiblePhaseCycles + form.cappedPhaseCycles}) should
                    equal installment count ({flexiblePaymentMonths}) — adjust on
                    Flexible rules. Duration ({form.durationMonths}) is maturity
                    only when it differs.
                  </p>
                ) : null}
              </FormSection>
            )}

            {current.id === "amount" && (
              <>
                    <FieldLabel>Amount mode</FieldLabel>
                    <Select
                      value={form.amountMode}
                      onValueChange={(v) =>
                        set({
                          amountMode:
                            v as PlanBuilderFormState["amountMode"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JEWELLER_FIXED">
                          Jeweller fixed
                        </SelectItem>
                        <SelectItem value="JEWELLER_SLABS">Slabs</SelectItem>
                        <SelectItem value="CUSTOMER_CHOSEN">
                          Customer chosen (min / max / multiple)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.amountMode === "JEWELLER_FIXED" && (
                      <>
                        <FieldLabel>Fixed installment (₹)</FieldLabel>
                        <Input
                          type="number"
                          value={form.fixedAmount}
                          onChange={(e) =>
                            set({ fixedAmount: Number(e.target.value) })
                          }
                        />
                      </>
                    )}
                    {form.amountMode === "JEWELLER_SLABS" && (
                      <>
                        <FieldLabel>Slab amounts (₹, comma-separated)</FieldLabel>
                        <Input
                          value={form.slabsCsv}
                          onChange={(e) => set({ slabsCsv: e.target.value })}
                          placeholder="1000,2000,5000,10000"
                        />
                      </>
                    )}
                    {form.amountMode === "CUSTOMER_CHOSEN" && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <FieldLabel>Min (₹)</FieldLabel>
                          <Input
                            type="number"
                            value={form.minAmount}
                            onChange={(e) =>
                              set({ minAmount: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Max (₹)</FieldLabel>
                          <Input
                            type="number"
                            value={form.maxAmount}
                            onChange={(e) =>
                              set({ maxAmount: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Multiple of (₹)</FieldLabel>
                          <Input
                            type="number"
                            value={form.multipleOf}
                            onChange={(e) =>
                              set({ multipleOf: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    )}
                <AmountSummaryStrip label={amountSummaryLabel(form)} />
              </>
            )}

            {current.id === "schedule" && (
              <>
                <FieldLabel>Due day of month</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dueDay}
                  onChange={(e) => set({ dueDay: Number(e.target.value) })}
                />
                <FieldLabel>Grace days</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.graceDays}
                  onChange={(e) => set({ graceDays: Number(e.target.value) })}
                />
                <ToggleRow
                  label="Default: collect first installment at enrolment"
                  checked={form.firstInstallmentCollectNow}
                  onCheckedChange={(v) =>
                    set({ firstInstallmentCollectNow: v })
                  }
                />
                <ToggleRow
                  label="Staff can change first-instalment mode at enrolment"
                  detail="When off, enrolment always uses the default above."
                  checked={form.firstInstallmentModeEditable}
                  onCheckedChange={(v) =>
                    set({ firstInstallmentModeEditable: v })
                  }
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment rules (fixed plans)
                </p>
                <ToggleRow
                  label="Partial payments allowed"
                  checked={form.partialPaymentAllowed}
                  onCheckedChange={(v) =>
                    set({ partialPaymentAllowed: v })
                  }
                />
                <ToggleRow
                  label="Advance installments allowed"
                  checked={form.advancePaymentAllowed}
                  onCheckedChange={(v) =>
                    set({ advancePaymentAllowed: v })
                  }
                />
                {form.advancePaymentAllowed && (
                  <div>
                    <FieldLabel>Max advance installments</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={form.maxAdvanceInstallments}
                      onChange={(e) =>
                        set({
                          maxAdvanceInstallments: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Min per transaction (₹, optional)</FieldLabel>
                    <Input
                      type="number"
                      value={form.minPaymentPerTxn || ""}
                      onChange={(e) =>
                        set({
                          minPaymentPerTxn: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Max per transaction (₹, optional)</FieldLabel>
                    <Input
                      type="number"
                      value={form.maxPaymentPerTxn || ""}
                      onChange={(e) =>
                        set({
                          maxPaymentPerTxn: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {current.id === "flexible" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#eaded9] bg-linear-to-r from-[#faf7f5] to-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7b0a2b]">
                    Flexible plan designer
                  </p>
                  <p className="mt-1 text-sm text-[#4c3a3f]">
                    Configure the plan in three chunks. Most teams only need the
                    Basics tab and one policy decision.
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                  <Tabs defaultValue="basics" className="space-y-4">
                    <TabsList variant="detailSub" className="w-full">
                      <TabsTrigger value="basics">1. Basics</TabsTrigger>
                      <TabsTrigger value="cap">2. Cap math</TabsTrigger>
                      <TabsTrigger value="collection">3. Collection</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basics" className="space-y-4">
                      <FormSection
                        title="Free window setup"
                        tone="free"
                        hint="Choose month split and free-window limits."
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Free phase (months)</FieldLabel>
                            <FieldHint>Variable payments allowed each month.</FieldHint>
                            <Input
                              type="number"
                              min={1}
                              value={form.flexiblePhaseCycles}
                              onChange={(e) =>
                                set({
                                  flexiblePhaseCycles: Number(e.target.value),
                                  averagingDivisor: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>Capped phase (months)</FieldLabel>
                            <FieldHint>Each month has its own cap from average.</FieldHint>
                            <Input
                              type="number"
                              min={1}
                              value={form.cappedPhaseCycles}
                              onChange={(e) =>
                                set({ cappedPhaseCycles: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                        <FlexiblePhaseTimeline
                          flexibleCycles={form.flexiblePhaseCycles}
                          cappedCycles={form.cappedPhaseCycles}
                          capFormula={form.capFormula}
                          averagingDivisor={form.averagingDivisor}
                        />
                        <div className="border-t border-emerald-200/80 pt-4">
                          <FreeWindowPaymentLimits
                            form={form}
                            onChange={set}
                            embedded
                          />
                        </div>
                      </FormSection>
                    </TabsContent>
                    <TabsContent value="cap" className="space-y-4">
                      <FormSection
                        title="Cap calculation"
                        tone="capped"
                        hint="Set rounding and cap range after free-window phase ends."
                      >
                        <div>
                          <FieldLabel>How to compute the monthly cap</FieldLabel>
                          <FieldHint>
                            Applies when the free window ends and the capped phase
                            starts.
                          </FieldHint>
                          <Select
                            value={form.capFormula}
                            onValueChange={(v) =>
                              set({
                                capFormula:
                                  v as PlanBuilderFormState["capFormula"],
                              })
                            }
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR">
                                Total free-phase payments ÷ averaging divisor
                                (usually free months)
                              </SelectItem>
                              <SelectItem value="FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT">
                                Total free-phase payments ÷ number of payments
                                made
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Averaging divisor</FieldLabel>
                            <FieldHint>
                              {capUsesPaymentCount
                                ? "Not used when dividing by payment count."
                                : "Usually equal to free months."}
                            </FieldHint>
                            <Input
                              type="number"
                              min={1}
                              value={form.averagingDivisor}
                              disabled={capUsesPaymentCount}
                              onChange={(e) =>
                                set({ averagingDivisor: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>Round cap to nearest (₹)</FieldLabel>
                            <Input
                              type="number"
                              min={1}
                              value={form.capRoundToNearest}
                              onChange={(e) =>
                                set({ capRoundToNearest: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>Floor — min cycle cap (₹)</FieldLabel>
                            <Input
                              type="number"
                              min={1}
                              value={form.capMinCycle}
                              onChange={(e) =>
                                set({ capMinCycle: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>Ceiling — max cycle cap (₹)</FieldLabel>
                            <Input
                              type="number"
                              min={1}
                              value={form.capMaxCycle}
                              onChange={(e) =>
                                set({ capMaxCycle: Number(e.target.value) })
                              }
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-[#5c4a2a]">
                          <p className="font-semibold text-[#28161a]">Live example</p>
                          <p className="mt-1">
                            ₹{exampleFreeTotal.toLocaleString("en-IN")} ÷{" "}
                            {capUsesPaymentCount
                              ? `${averageDivisor} payments (example: one per free month)`
                              : `${averageDivisor} (divisor)`}{" "}
                            = ₹{rawCap.toLocaleString("en-IN")}
                          </p>
                          <p>
                            Rounded to ₹{roundToNearest.toLocaleString("en-IN")} and
                            clamped to min/max gives{" "}
                            <strong>₹{projectedCap.toLocaleString("en-IN")}</strong>.
                          </p>
                        </div>
                      </FormSection>
                    </TabsContent>
                    <TabsContent value="collection" className="space-y-4">
                      <FormSection
                        title="Capped-month collection"
                        tone="capped"
                        hint="Rules that apply once monthly cap is locked."
                      >
                        <div>
                          <FieldLabel>Minimum payment per month (₹)</FieldLabel>
                          <FieldHint>Normal smallest payment in capped months.</FieldHint>
                          <Input
                            type="number"
                            min={1}
                            value={form.cappedMinPayment}
                            onChange={(e) =>
                              set({ cappedMinPayment: Number(e.target.value) })
                            }
                          />
                        </div>
                        <ToggleRow
                          label="Allow final remainder below minimum"
                          detail="Allows last small balance to clear the month cap."
                          checked={form.allowFinalRemainderBelowMinimum}
                          onCheckedChange={(v) =>
                            set({ allowFinalRemainderBelowMinimum: v })
                          }
                        />
                        <ToggleRow
                          label="Allow paying future months early"
                          detail="Off by default — customers pay one capped month at a time."
                          checked={form.allowFutureCyclePayment}
                          onCheckedChange={(v) =>
                            set({ allowFutureCyclePayment: v })
                          }
                        />
                        {form.allowFutureCyclePayment && (
                          <div>
                            <FieldLabel>Max months ahead</FieldLabel>
                            <Input
                              type="number"
                              min={0}
                              value={form.maxAdvanceCycles}
                              onChange={(e) =>
                                set({ maxAdvanceCycles: Number(e.target.value) })
                              }
                            />
                          </div>
                        )}
                      </FormSection>
                      <FormSection
                        title="Policy decisions"
                        tone="wine"
                        hint="How to handle low or zero free-window contribution."
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel>If customer paid nothing in free phase</FieldLabel>
                            <Select
                              value={form.onZeroFlexibleTotal}
                              onValueChange={(v) =>
                                set({
                                  onZeroFlexibleTotal:
                                    v as PlanBuilderFormState["onZeroFlexibleTotal"],
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USE_MINIMUM">
                                  Use minimum cap
                                </SelectItem>
                                <SelectItem value="CLOSE_SCHEME">
                                  Close scheme
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <FieldLabel>If free-phase total is below minimum</FieldLabel>
                            <Select
                              value={form.onBelowMinimumTotal}
                              onValueChange={(v) =>
                                set({
                                  onBelowMinimumTotal:
                                    v as PlanBuilderFormState["onBelowMinimumTotal"],
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USE_MINIMUM">
                                  Use minimum cycle cap
                                </SelectItem>
                                <SelectItem value="CLOSE_SCHEME">
                                  Close scheme
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </FormSection>
                    </TabsContent>
                  </Tabs>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[#eaded9] bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Live outcome
                      </p>
                      <p className="mt-1 text-sm text-[#5c4a4e]">
                        Projected monthly capped allowance
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-[#28161a]">
                        ₹{projectedCap.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#eaded9] bg-[#faf7f5] p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Configuration health
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        <li
                          className={
                            splitMatchesPaymentMonths
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }
                        >
                          {splitMatchesPaymentMonths ? "OK" : "Check"}: free +
                          capped = installment count ({flexiblePaymentMonths})
                        </li>
                        <li className={freeBoundsValid ? "text-emerald-700" : "text-amber-700"}>
                          {freeBoundsValid ? "OK" : "Check"}: free payment min/max
                        </li>
                        <li className={capBandValid ? "text-emerald-700" : "text-amber-700"}>
                          {capBandValid ? "OK" : "Check"}: cap floor/ceiling
                        </li>
                        <li className={collectionValid ? "text-emerald-700" : "text-amber-700"}>
                          {collectionValid ? "OK" : "Check"}: capped minimum payment
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-[#eaded9] bg-[#fff8e8] p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">
                        Quick presets
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            set({
                              onZeroFlexibleTotal: "USE_MINIMUM",
                              onBelowMinimumTotal: "USE_MINIMUM",
                              allowFutureCyclePayment: false,
                              maxAdvanceCycles: 0,
                            })
                          }
                        >
                          Safe default
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            set({
                              onZeroFlexibleTotal: "USE_MINIMUM",
                              onBelowMinimumTotal: "CLOSE_SCHEME",
                              allowFutureCyclePayment: false,
                              maxAdvanceCycles: 0,
                            })
                          }
                        >
                          Strict policy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            set({
                              onZeroFlexibleTotal: "USE_MINIMUM",
                              onBelowMinimumTotal: "USE_MINIMUM",
                              allowFutureCyclePayment: true,
                              maxAdvanceCycles: Math.max(1, form.maxAdvanceCycles),
                            })
                          }
                        >
                          Growth friendly
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <AmountSummaryStrip label={amountSummaryLabel(form)} />
              </div>
            )}

            {current.id === "benefit" && (
              <div className="space-y-4">
                {form.paymentPattern === "FLEXIBLE_AVERAGE" ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    Flexible schemes have no fixed installments, so
                    &quot;one free installment&quot; does not apply. Choose a
                    computed bonus (% or flat ₹) or a text benefit your team
                    honours at redemption.
                  </p>
                ) : null}
                {!form.editLocked && (
                <>
                <FieldLabel>Benefit type</FieldLabel>
                <Select
                  value={form.benefitType}
                  onValueChange={(v) => {
                    const type = v as PlanBuilderFormState["benefitType"];
                    const labels: Record<string, string> = {
                      ONE_FREE_INSTALLMENT: "12th installment free",
                      FIXED_BONUS_AMOUNT: "5% bonus on maturity (max ₹5,000)",
                      TEXT_ONLY: "Making charges waived",
                    };
                    set({
                      benefitType: type,
                      benefitDisplayLabel: labels[type] ?? form.benefitDisplayLabel,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedBenefitTypes(form.paymentPattern).includes(
                      "ONE_FREE_INSTALLMENT",
                    ) ? (
                      <SelectItem value="ONE_FREE_INSTALLMENT">
                        One free installment
                      </SelectItem>
                    ) : null}
                    <SelectItem value="FIXED_BONUS_AMOUNT">
                      Fixed bonus amount (% or flat ₹)
                    </SelectItem>
                    <SelectItem value="TEXT_ONLY">
                      Text-only (manual honour)
                    </SelectItem>
                  </SelectContent>
                </Select>
                </>
                )}
                <FieldLabel>Display label</FieldLabel>
                <Input
                  value={form.benefitDisplayLabel}
                  onChange={(e) =>
                    set({ benefitDisplayLabel: e.target.value })
                  }
                />
                {!form.editLocked &&
                  form.paymentPattern !== "FLEXIBLE_AVERAGE" &&
                  form.benefitType === "ONE_FREE_INSTALLMENT" && (
                  <>
                    <ToggleRow
                      label="Require all installments paid"
                      checked={form.requireAllInstallmentsPaid}
                      onCheckedChange={(v) =>
                        set({ requireAllInstallmentsPaid: v })
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Max allowed defaults</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          value={form.maxAllowedDefaults}
                          onChange={(e) =>
                            set({
                              maxAllowedDefaults: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Min months completed</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          value={form.minMonthsCompleted}
                          onChange={(e) =>
                            set({
                              minMonthsCompleted: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
                {!form.editLocked && form.benefitType === "FIXED_BONUS_AMOUNT" && (
                  <>
                    <FieldLabel>Bonus basis</FieldLabel>
                    <Select
                      value={form.bonusBasis}
                      onValueChange={(v) =>
                        set({
                          bonusBasis: v as PlanBuilderFormState["bonusBasis"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT_OF_PAID">
                          Percent of total paid
                        </SelectItem>
                        <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>
                          {form.bonusBasis === "FLAT"
                            ? "Bonus amount (₹)"
                            : "Bonus percent (%)"}
                        </FieldLabel>
                        <Input
                          type="number"
                          value={form.bonusValue}
                          onChange={(e) =>
                            set({ bonusValue: Number(e.target.value) })
                          }
                        />
                      </div>
                      {form.bonusBasis === "PERCENT_OF_PAID" && (
                        <div>
                          <FieldLabel>Max bonus cap (₹)</FieldLabel>
                          <Input
                            type="number"
                            value={form.maxBonus}
                            onChange={(e) =>
                              set({ maxBonus: Number(e.target.value) })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
                {!form.editLocked && form.benefitType === "TEXT_ONLY" && (
                  <>
                    <FieldLabel>Benefit text (shown on app & redemption)</FieldLabel>
                    <Textarea
                      rows={4}
                      value={form.textBenefit}
                      onChange={(e) => set({ textBenefit: e.target.value })}
                    />
                  </>
                )}
                <p className="rounded-lg bg-[#fff8e8] p-3 text-sm">
                  {benefitSummaryLabel(form)}
                </p>
              </div>
            )}

            {current.id === "redemption" && (
              <div className="space-y-4">
                <ToggleRow
                  label="Premature closure allowed"
                  detail="Customers may exit before maturity subject to lock-in and penalty rules."
                  checked={form.prematureClosureAllowed}
                  onCheckedChange={(v) =>
                    set({ prematureClosureAllowed: v })
                  }
                />
                <div>
                  <FieldLabel>Lock-in months</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={form.lockInMonths}
                    onChange={(e) =>
                      set({ lockInMonths: Number(e.target.value) })
                    }
                  />
                </div>
                <FieldLabel>Premature penalty</FieldLabel>
                <Select
                  value={form.penaltyMode}
                  onValueChange={(v) =>
                    set({
                      penaltyMode: v as PlanBuilderFormState["penaltyMode"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="PERCENT_OF_PAID">
                      Percent of paid
                    </SelectItem>
                    <SelectItem value="FLAT">Flat amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
                {form.penaltyMode === "PERCENT_OF_PAID" && (
                  <div>
                    <FieldLabel>Penalty percent</FieldLabel>
                    <Input
                      type="number"
                      value={form.penaltyPercent}
                      onChange={(e) =>
                        set({ penaltyPercent: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {form.penaltyMode === "FLAT" && (
                  <div>
                    <FieldLabel>Flat penalty (₹)</FieldLabel>
                    <Input
                      type="number"
                      value={form.penaltyFlat}
                      onChange={(e) =>
                        set({ penaltyFlat: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                <FieldLabel>Benefit treatment on premature close</FieldLabel>
                <Select
                  value={form.benefitTreatment}
                  onValueChange={(v) =>
                    set({
                      benefitTreatment:
                        v as PlanBuilderFormState["benefitTreatment"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORFEIT">Forfeit benefit</SelectItem>
                    <SelectItem value="FULL">Full benefit</SelectItem>
                  </SelectContent>
                </Select>
                <FieldLabel>Allowed redemption modes</FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REDEMPTION_MODE_OPTIONS.map(({ id, label }) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                      <Checkbox
                        checked={form.allowedRedemptionModes.includes(id)}
                        onCheckedChange={() => toggleRedemptionMode(id)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <ToggleRow
                  label="Redeem at any branch"
                  checked={form.redeemAtAnyBranch}
                  onCheckedChange={(v) => set({ redeemAtAnyBranch: v })}
                />
              </div>
            )}

            {current.id === "availability" && (
              <div className="space-y-4">
                <ToggleRow
                  label="Available at all branches"
                  checked={form.allBranches}
                  onCheckedChange={(v) =>
                    set({ allBranches: v, branchIds: v ? [] : form.branchIds })
                  }
                />
                {!form.allBranches ? (
                  <div className="space-y-2 rounded-xl border p-4">
                    <FieldLabel>Branches where this plan is sold</FieldLabel>
                    {branches.length ? (
                      branches.map((b) => (
                        <label
                          key={b.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={form.branchIds.includes(b.id)}
                            onCheckedChange={(checked) => {
                              set({
                                branchIds: checked
                                  ? [...form.branchIds, b.id]
                                  : form.branchIds.filter((id) => id !== b.id),
                              });
                            }}
                          />
                          {b.name}
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No branches loaded — add branches in Settings.
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Enrolment open from</FieldLabel>
                    <Input
                      type="date"
                      value={form.enrolmentOpenFrom}
                      onChange={(e) =>
                        set({ enrolmentOpenFrom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Enrolment open to</FieldLabel>
                    <Input
                      type="date"
                      value={form.enrolmentOpenTo}
                      onChange={(e) =>
                        set({ enrolmentOpenTo: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Max enrolments (optional)</FieldLabel>
                  <Input
                    type="number"
                    value={form.maxEnrolments}
                    onChange={(e) =>
                      set({
                        maxEnrolments:
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <ToggleRow
                  label="Visible in customer app"
                  checked={form.visibleInCustomerApp}
                  onCheckedChange={(v) =>
                    set({ visibleInCustomerApp: v })
                  }
                />
                <ToggleRow
                  label="Customer self-enrol allowed"
                  checked={form.customerSelfEnrolAllowed}
                  onCheckedChange={(v) =>
                    set({ customerSelfEnrolAllowed: v })
                  }
                />
              </div>
            )}

            {current.id === "review" && (
              <div className="space-y-5">
                <ReviewSummaryCard
                  rows={[
                    {
                      label: "Plan",
                      value: `${form.name || "—"} (${form.code || "—"})`,
                    },
                    {
                      label: "Type",
                      value: `${paymentPatternLabel(form.paymentPattern)} · ${valueBasisLabel(form.valueBasis)}`,
                    },
                    {
                      label: "Tenure",
                      value: `${form.durationMonths} months · ${form.installmentCount} periods`,
                    },
                    {
                      label: "Contributions",
                      value: amountSummaryLabel(form),
                    },
                    {
                      label: "Benefit",
                      value: benefitSummaryLabel(form),
                    },
                    {
                      label: "Redemption",
                      value: form.prematureClosureAllowed
                        ? `Early exit · ${form.lockInMonths} mo lock-in · ${penaltyModeLabel(form.penaltyMode)} · ${redemptionModesLabel(form.allowedRedemptionModes)}`
                        : `Maturity only · ${redemptionModesLabel(form.allowedRedemptionModes)}`,
                    },
                    {
                      label: "App",
                      value: form.visibleInCustomerApp
                        ? form.customerSelfEnrolAllowed
                          ? "Visible · self-enrol on"
                          : "Visible · staff enrol only"
                        : "Hidden from customer app",
                    },
                  ]}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onPreview()}
                >
                  Refresh preview
                </Button>
                <PlanSchedulePreviewPanel
                  data={previewState.data}
                  loading={previewState.isLoading}
                  error={previewError}
                />
              </div>
            )}
          </fieldset>
          <div className="flex justify-between border-t p-4">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => go(-1)}
            >
              Back
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button
                onClick={() => {
                  const stepErrors = validatePlanBuilderStep(current.id, form, {
                    isEdit,
                  });
                  if (Object.keys(stepErrors).length) {
                    setFieldErrors(stepErrors);
                    toast.error("Fix the highlighted fields on this step.");
                    return;
                  }
                  setFieldErrors({});
                  go(1);
                  if (
                    ["duration", "amount", "schedule", "flexible"].includes(
                      current.id,
                    )
                  ) {
                    void onPreview();
                  }
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  const allErrors = validatePlanBuilderFull(form, { isEdit });
                  if (Object.keys(allErrors).length) {
                    setFieldErrors(allErrors);
                    toast.error("Fix validation errors before saving.");
                    return;
                  }
                  try {
                    if (isEdit && planId) {
                      await patchPlan({
                        planId,
                        body: buildPlanPatchPayload(form),
                      }).unwrap();
                      toast.success("Plan updated");
                      router.push(`/schemes/${planId}`);
                    } else {
                      const created = (await createPlan(
                        buildPlanCreatePayload(form) as Record<string, unknown>,
                      ).unwrap()) as Record<string, unknown>;
                      const newId = String(created.id ?? created._id ?? "");
                      toast.success("Plan draft created");
                      router.push(newId ? `/schemes/${newId}` : "/schemes");
                    }
                  } catch (err: unknown) {
                    toast.error(
                      parseApiError(
                        err,
                        "Could not save plan. Check required fields and try again.",
                      ).message,
                    );
                  }
                }}
              >
                {isEdit ? "Save changes" : "Create draft"}
              </Button>
            )}
          </div>
        </Surface>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <PlanBuilderCustomerPreview
            form={form}
            steps={steps}
            stepIndex={stepIndex}
            isEdit={isEdit}
            preview={previewState.data}
            loading={previewState.isLoading}
          />
        </div>
      </div>
    </>
  );
}
