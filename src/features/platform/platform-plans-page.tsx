"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, Edit3, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  emptyPlatformSubscriptionPlanForm,
  limitFieldKey,
  livePlatformSubscriptionPlanFieldErrors,
  parsePlanLimitInput,
  platformSubscriptionPlanFormFromPlan,
  platformSubscriptionPlanFormReady,
  platformSubscriptionPlanFormUnchanged,
  PLAN_TIERS,
  sanitizePlanPaiseInput,
  sanitizePlanSortOrderInput,
  sanitizePlanTrialDaysInput,
  subscriptionPlanBodyForApi,
  validatePlatformSubscriptionPlanForm,
  type PlatformSubscriptionPlanForm,
} from "@/src/lib/platform-subscription-plan-form-validation";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  useDeprecatePlatformPlanMutation,
  useGetPlatformPlansQuery,
  useSavePlatformPlanMutation,
} from "@/src/store/api/platform-api";
import type { PlatformPlan } from "@/src/types/platform";

function formatLimitLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function PlatformPlansPage() {
  const query = useGetPlatformPlansQuery();
  const [editing, setEditing] = useState<PlatformPlan | null | undefined>(undefined);

  const rows = query.data ?? [];
  const plans = useMemo(() => [...rows].sort((a, b) => a.sortOrder - b.sortOrder), [rows]);

  if (query.isLoading) return <PageSkeleton cards={4} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const activeCount = plans.filter((p) => p.status === "ACTIVE").length;
  const deprecatedCount = plans.filter((p) => p.status === "DEPRECATED").length;
  const subscribedTotal = plans.reduce((sum, p) => sum + (p.tenantCount ?? 0), 0);
  const highlightedCount = plans.filter((p) => p.highlighted).length;

  return (
    <>
      <PageHeader
        eyebrow="Commercial catalogue"
        title="Subscription plans"
        description="Define platform limits, product entitlements, billing cycles and public signup visibility."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus />
            Create plan
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Sparkles} label="Active plans" value={activeCount} detail="Available to platform operations" />
        <StatCard
          icon={Check}
          label="Subscribed jewellers"
          value={subscribedTotal}
          detail="Sum of tenantCount per tier"
          tone="green"
        />
        <StatCard icon={Archive} label="Deprecated" value={deprecatedCount} detail="Hidden from new sales" tone="cream" />
        <StatCard icon={Sparkles} label="Highlighted" value={highlightedCount} detail="Public recommended plan" tone="gold" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={() => setEditing(plan)} />
        ))}
      </div>
      {editing !== undefined && (
        <PlanDialog plan={editing} open onOpenChange={(v) => !v && setEditing(undefined)} />
      )}
    </>
  );
}

function PlanCard({ plan, onEdit }: { plan: PlatformPlan; onEdit: () => void }) {
  const [deprecate] = useDeprecatePlatformPlanMutation();
  const monthlyPaise = plan.monthlyPrice?.amountPaise ?? 0;
  const yearlyPaise = plan.yearlyPrice?.amountPaise ?? 0;
  const isCustomPricing = plan.tier === "CUSTOM" && !monthlyPaise;

  return (
    <Surface className={plan.highlighted ? "border-[#d2a94d] ring-2 ring-[#f4dfaa]" : ""}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">{plan.tier}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{plan.displayName}</h2>
          </div>
          <StatusBadge status={plan.status} />
        </div>
        <p className="mt-5 text-3xl font-extrabold">
          {isCustomPricing ? plan.priceLabel ?? "Contact Us" : plan.monthlyPrice.amountDisplay}
          <span className="text-sm font-normal text-muted-foreground">
            {isCustomPricing ? " pricing" : " / month"}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {yearlyPaise ? `${plan.yearlyPrice.amountDisplay} annually` : "Annual price not set"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Billing: {(plan.supportedBillingCycles ?? ["MONTHLY"]).join(" · ")} · {plan.trialDays}d trial
        </p>
        <div className="my-5 h-px bg-border" />
        <div className="space-y-3 text-sm">
          {Object.entries(plan.limits).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{formatLimitLabel(key)}</span>
                <strong>{value?.toLocaleString("en-IN") ?? "Unlimited"}</strong>
              </div>
            ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <Edit3 />
            Edit
          </Button>
          {plan.status === "ACTIVE" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-700"
              title="Deprecate"
              onClick={async () => {
                try {
                  await deprecate(plan.id).unwrap();
                  toast.success("Plan deprecated");
                } catch (err) {
                  handleFormApiError(err, {
                    fallback: "Could not deprecate plan",
                  });
                }
              }}
            >
              <Archive />
            </Button>
          )}
        </div>
        {plan.displayFeatures?.length ? (
          <div className="mt-4 space-y-1 border-t pt-4 text-xs text-muted-foreground">
            {plan.displayFeatures.slice(0, 3).map((f) => (
              <p key={f.label}>
                {f.label}: <strong className="text-foreground">{f.value}</strong>
              </p>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {plan.tenantCount ?? 0} subscribed jewellers · v{plan.version ?? 1}
        </p>
      </div>
    </Surface>
  );
}

function PlanField({
  label: text,
  value,
  onChange,
  error,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{text}</FieldLabel>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className={cn(error && "border-red-600")}
        aria-invalid={Boolean(error)}
      />
      <FormFieldError message={error} />
    </div>
  );
}

function PlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: PlatformPlan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [save, saveState] = useSavePlatformPlanMutation();
  const [baseline, setBaseline] = useState<PlatformSubscriptionPlanForm>(() =>
    plan ? platformSubscriptionPlanFormFromPlan(plan) : emptyPlatformSubscriptionPlanForm(),
  );
  const [form, setForm] = useState<PlatformSubscriptionPlanForm>(() =>
    plan ? platformSubscriptionPlanFormFromPlan(plan) : emptyPlatformSubscriptionPlanForm(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const next = plan
      ? platformSubscriptionPlanFormFromPlan(plan)
      : emptyPlatformSubscriptionPlanForm();
    setBaseline(next);
    setForm(next);
    setFieldErrors({});
    setTouched({});
  }, [open, plan]);

  const liveErrors = useMemo(
    () => livePlatformSubscriptionPlanFieldErrors(form, touched),
    [form, touched],
  );

  const displayError = (field: string) =>
    fieldErrors[field] ?? liveErrors[field];

  const setField = <K extends keyof PlatformSubscriptionPlanForm>(
    key: K,
    value: PlatformSubscriptionPlanForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const markAllTouched = () => {
    const next: Record<string, boolean> = {
      name: true,
      displayName: true,
      monthlyPricePaise: true,
      yearlyPricePaise: true,
      trialDays: true,
      sortOrder: true,
    };
    for (const key of Object.keys(form.limits)) {
      next[limitFieldKey(key)] = true;
    }
    setTouched(next);
  };

  const submitDisabled =
    saveState.isLoading ||
    !platformSubscriptionPlanFormReady(form) ||
    (plan != null && platformSubscriptionPlanFormUnchanged(form, baseline));

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? `Edit ${plan.displayName}` : "Create subscription plan"}
      description="Prices are stored as integer paise. Leave limits empty on CUSTOM tier for unlimited."
      actionLabel={plan ? "Save plan" : "Create plan"}
      className="sm:max-w-3xl"
      submitDisabled={submitDisabled}
      suppressDefaultErrorToast
      onError={(err) => {
        handleFormApiError(err, {
          setFieldErrors,
          fieldAliases: {
            monthlyPricePaise: "monthlyPricePaise",
            yearlyPricePaise: "yearlyPricePaise",
          },
          fallback: plan ? "Could not update plan" : "Could not create plan",
        });
      }}
      onSubmit={async () => {
        markAllTouched();
        const clientErrors = validatePlatformSubscriptionPlanForm(form);
        if (Object.keys(clientErrors).length) {
          setFieldErrors(clientErrors);
          toast.error("Fix the highlighted fields.");
          return false;
        }
        const body = subscriptionPlanBodyForApi(form, { isEdit: Boolean(plan?.id) });
        if (plan?.id) {
          await save({ planId: plan.id, body }).unwrap();
        } else {
          await save({ body }).unwrap();
        }
        toast.success(plan ? "Plan updated" : "Plan created");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Tier</FieldLabel>
          <Select
            value={form.tier}
            onValueChange={(v) =>
              setField("tier", v as PlatformSubscriptionPlanForm["tier"])
            }
            disabled={Boolean(plan)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_TIERS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PlanField
          label="Internal name"
          value={form.name}
          onChange={(v) => {
            setTouched((p) => ({ ...p, name: true }));
            setField("name", v);
          }}
          error={displayError("name")}
        />
        <PlanField
          label="Display name *"
          value={form.displayName}
          onChange={(v) => {
            setTouched((p) => ({ ...p, displayName: true }));
            setField("displayName", v);
          }}
          error={displayError("displayName")}
        />
        <PlanField
          label="Monthly price (paise) *"
          inputMode="numeric"
          value={String(form.monthlyPricePaise)}
          onChange={(v) => {
            setTouched((p) => ({ ...p, monthlyPricePaise: true }));
            setField("monthlyPricePaise", sanitizePlanPaiseInput(v));
          }}
          error={displayError("monthlyPricePaise")}
        />
        <PlanField
          label="Yearly price (paise) *"
          inputMode="numeric"
          value={String(form.yearlyPricePaise)}
          onChange={(v) => {
            setTouched((p) => ({ ...p, yearlyPricePaise: true }));
            setField("yearlyPricePaise", sanitizePlanPaiseInput(v));
          }}
          error={displayError("yearlyPricePaise")}
        />
        <PlanField
          label="Trial days *"
          inputMode="numeric"
          value={String(form.trialDays)}
          onChange={(v) => {
            setTouched((p) => ({ ...p, trialDays: true }));
            setField("trialDays", sanitizePlanTrialDaysInput(v));
          }}
          error={displayError("trialDays")}
        />
        <PlanField
          label="Sort order *"
          inputMode="numeric"
          value={String(form.sortOrder)}
          onChange={(v) => {
            setTouched((p) => ({ ...p, sortOrder: true }));
            setField("sortOrder", sanitizePlanSortOrderInput(v));
          }}
          error={displayError("sortOrder")}
        />
      </div>
      <p className="mb-2 mt-5 text-sm font-bold">Limits</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(form.limits).map(([k, v]) => {
          const field = limitFieldKey(k);
          return (
            <PlanField
              key={k}
              label={formatLimitLabel(k)}
              inputMode="numeric"
              placeholder={form.tier === "CUSTOM" ? "Empty = unlimited" : undefined}
              value={v == null ? "" : String(v)}
              onChange={(raw) => {
                setTouched((p) => ({ ...p, [field]: true }));
                setForm((prev) => ({
                  ...prev,
                  limits: {
                    ...prev.limits,
                    [k]: parsePlanLimitInput(raw, prev.tier),
                  },
                }));
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next[field];
                  return next;
                });
              }}
              error={displayError(field)}
            />
          );
        })}
      </div>
      <p className="mb-2 mt-5 text-sm font-bold">Feature entitlements</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(form.features).map(([k, v]) => (
          <label
            key={k}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <span>{formatLimitLabel(k)}</span>
            <Checkbox
              checked={Boolean(v)}
              onCheckedChange={(x) =>
                setForm((prev) => ({
                  ...prev,
                  features: { ...prev.features, [k]: Boolean(x) },
                }))
              }
            />
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-xl bg-[#fff8e9] p-4">
        <Checkbox
          checked={form.highlighted}
          onCheckedChange={(v) => setField("highlighted", Boolean(v))}
        />
        <span>Highlight as recommended plan</span>
      </label>
    </ActionDialog>
  );
}
