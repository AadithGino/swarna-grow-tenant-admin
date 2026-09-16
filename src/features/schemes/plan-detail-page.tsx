"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  Gift,
  IndianRupee,
  Layers3,
  LockKeyhole,
  Pencil,
  Scale,
  ScrollText,
  Shield,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/src/components/common/permission-gate";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { ACTION } from "@/src/lib/action-permissions";
import {
  useActivatePlanMutation,
  useDeactivatePlanMutation,
  useDuplicatePlanMutation,
  useGetPlanQuery,
  useGetPlanStatsQuery,
  usePreviewPlanScheduleMutation,
} from "@/src/store/api/admin-api";
import {
  PlanAvailabilitySidebar,
  PlanDetailHero,
  PlanFlexiblePhaseBar,
  PlanPerformanceSidebar,
  PlanPerformanceTab,
  PlanSchedulePreviewSurface,
  PlanStaffMetaGrid,
  PlanTermsPanel,
} from "@/src/features/schemes/plan-detail-visuals";
import {
  amountRulesFields,
  benefitFields,
  flexibleRulesFields,
  goldRulesFields,
  paymentRulesFields,
  penaltyDisplay,
  scheduleRulesFields,
  type FieldEntry,
} from "@/src/features/schemes/plan-contract-fields";
import {
  amountSummaryLabel,
  planDetailToForm,
} from "@/src/features/schemes/plan-builder-form";
import { cn } from "@/lib/utils";

function InfoTile({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-[#2d191d]">{value}</dd>
    </div>
  );
}

function ContractFieldGrid({
  entries,
  className,
}: {
  entries: FieldEntry[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-5 sm:grid-cols-2", className)}>
      {entries.map((e) => (
        <InfoTile key={e.label} label={e.label} value={e.value} />
      ))}
    </dl>
  );
}

function YesNo({ ok, yes = "Yes", no = "No" }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-semibold",
        ok ? "text-emerald-700" : "text-[#776a6d]",
      )}
    >
      {ok ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-60" />}
      {ok ? yes : no}
    </span>
  );
}

function RulesSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("scroll-mt-4", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7ecee] text-[#7b0a2b]">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2d191d]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-[#e4d7d2] bg-[#faf7f5]/50 p-5">
        {children}
      </div>
    </div>
  );
}

export function PlanDetailPage({ planId }: { planId: string }) {
  const router = useRouter();
  const planQuery = useGetPlanQuery(planId);
  const statsQuery = useGetPlanStatsQuery(planId);
  const [duplicatePlan] = useDuplicatePlanMutation();
  const [activatePlan] = useActivatePlanMutation();
  const [deactivatePlan] = useDeactivatePlanMutation();
  const [previewSchedule, previewState] = usePreviewPlanScheduleMutation();

  useEffect(() => {
    if (!planQuery.data) return;
    const p = planQuery.data as Record<string, unknown>;
    const rules = (p.amountRules ?? {}) as Record<string, unknown>;
    const minPaise = Number(rules.minInstallmentPaise ?? rules.fixedAmountPaise ?? 0);
    void previewSchedule({
      planId,
      ...(String(p.paymentPattern ?? "").includes("FLEXIBLE")
        ? {}
        : {
            installmentAmountPaise: minPaise || 300000,
            firstInstallmentMode:
              (p.scheduleRules as Record<string, unknown> | null)
                ?.firstInstallmentModeDefault ?? "COLLECT_NOW",
          }),
      startDate: new Date().toISOString().slice(0, 10),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview when plan payload loads
  }, [planId, planQuery.data]);

  if (planQuery.isLoading) return <PageSkeleton cards={5} />;
  if (planQuery.isError || !planQuery.data)
    return (
      <QueryError
        onRetry={planQuery.refetch}
        title="Scheme plan could not be loaded"
      />
    );

  const plan = planQuery.data as Record<string, unknown>;
  const amountRules = (plan.amountRules ?? {}) as Record<string, unknown>;
  const scheduleRules = plan.scheduleRules as Record<string, unknown> | null;
  const paymentRules = (plan.paymentRules ?? {}) as Record<string, unknown>;
  const flexibleRules = (plan.flexibleRules ?? null) as Record<
    string,
    unknown
  > | null;
  const goldRules = (plan.goldRules ?? null) as Record<string, unknown> | null;
  const benefit = (plan.benefit ?? {}) as Record<string, unknown>;
  const redemption = (plan.redemptionRules ?? {}) as Record<string, unknown>;
  const penalty = (redemption.prematurePenalty ?? {}) as Record<string, unknown>;
  const avail = (plan.availability ?? {}) as Record<string, unknown>;
  const amountSummary = (plan.amountSummary ?? {}) as Record<string, unknown>;
  const inlineStats = (plan.stats ?? {}) as Record<string, unknown>;
  const pattern = String(plan.paymentPattern ?? "FIXED");
  const editLocked = Boolean(plan.editLocked);
  const status = String(plan.status ?? "DRAFT");
  const isFlexible = pattern.includes("FLEXIBLE");
  const displayName = String(plan.displayName ?? plan.name);
  const benefitLabel = String(benefit.displayLabel ?? benefit.type ?? "—");
  const description =
    String(plan.description ?? "").trim() ||
    "Add a customer-facing description in the plan builder.";
  const amountLabel =
    String(amountSummary.label ?? "").trim() ||
    amountSummaryLabel(planDetailToForm(plan));
  const redemptionModes = Array.isArray(redemption.allowedModes)
    ? (redemption.allowedModes as string[])
    : [];
  const flexCycles = Number(
    (flexibleRules?.flexiblePhaseCycles as number | undefined) ?? 6,
  );
  const cappedCycles = Number(
    (flexibleRules?.cappedPhaseCycles as number | undefined) ?? 5,
  );
  const collectedDisplay =
    typeof inlineStats.collectedThisMonth === "object" &&
    inlineStats.collectedThisMonth &&
    "amountDisplay" in (inlineStats.collectedThisMonth as object)
      ? String((inlineStats.collectedThisMonth as { amountDisplay: string }).amountDisplay)
      : undefined;
  const statsData = statsQuery.data as
    | {
        enrolments?: Record<string, number>;
        active?: number;
        total?: number;
        financials?: Record<string, { amountDisplay?: string } | unknown>;
        charts?: Record<string, unknown>;
      }
    | undefined;
  const activeSchemes = Number(
    inlineStats.activeSchemes ??
      statsData?.enrolments?.active ??
      statsData?.active ??
      0,
  );
  const totalEnrolments = Number(
    inlineStats.totalEnrolments ??
      statsData?.enrolments?.total ??
      statsData?.total ??
      activeSchemes,
  );
  const enrolWindow =
    avail.enrolmentOpenFrom || avail.enrolmentOpenTo
      ? `${avail.enrolmentOpenFrom ?? "Open"} → ${avail.enrolmentOpenTo ?? "No end"}`
      : "Always open";

  return (
    <div className="space-y-6 pb-10">
      <Link
        href="/schemes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#730321]"
      >
        ← Back to scheme plans
      </Link>

      <PageHeader
        eyebrow="Scheme plan"
        title={displayName}
        description={`${plan.code} · ${pattern.replace(/_/g, " ")} · ${String(plan.valueBasis).replace(/_/g, " ")}`}
        actions={
          <PermissionGate permission={ACTION.planWrite}>
            <div className="flex flex-wrap gap-2">
              {editLocked ? (
                <Button
                  onClick={() => router.push(`/schemes/${planId}/duplicate`)}
                >
                  <Copy />
                  Duplicate to edit
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/schemes/${planId}/edit`}>
                    <Pencil />
                    Edit plan
                  </Link>
                </Button>
              )}
              {status === "DRAFT" ? (
                <Button
                  variant="secondary"
                  className="bg-[#f3eef0]"
                  onClick={async () => {
                    await activatePlan(planId).unwrap();
                    toast.success(`${displayName} is now active`);
                  }}
                >
                  Activate
                </Button>
              ) : status === "ACTIVE" ? (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    await deactivatePlan(planId).unwrap();
                    toast.success(`${displayName} deactivated`);
                  }}
                >
                  Deactivate
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const copy = await duplicatePlan(planId).unwrap();
                    toast.success(`${copy.code} duplicated`);
                  } catch {
                    toast.error("Could not duplicate plan");
                  }
                }}
              >
                <Copy />
                Duplicate
              </Button>
            </div>
          </PermissionGate>
        }
      />

      {editLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-[#fff8e8] px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <LockKeyhole className="size-4 text-amber-800" />
            <span className="font-semibold text-[#805817]">Financial rules locked</span>
            <Badge variant="outline" className="border-amber-300 bg-white/80">
              {activeSchemes} active enrolments
            </Badge>
          </div>
          <p className="mt-2 text-[#5c4a2a]">
            Duplicate this plan to change amounts or schedule. Profile, benefit label, and
            availability can still be edited on the live plan.
          </p>
        </div>
      ) : status === "DRAFT" ? (
        <div className="rounded-2xl border border-[#eadbb5] bg-[#fff7df] px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="DRAFT" />
            <span className="font-semibold text-[#805817]">Not visible to customers yet</span>
          </div>
          <p className="mt-2 text-muted-foreground">
            Activate when branches are ready to enrol on this template.
          </p>
        </div>
      ) : status === "ACTIVE" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="ACTIVE" />
            <span className="font-semibold text-emerald-800">Live for enrolment</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Status"
          value={<StatusBadge status={status} />}
          detail={`v${plan.version ?? 1}${editLocked ? " · locked" : ""}`}
          tone="wine"
        />
        <StatCard
          icon={Gift}
          label="Active enrolments"
          value={activeSchemes.toLocaleString("en-IN")}
          detail={`${totalEnrolments.toLocaleString("en-IN")} total`}
          tone="gold"
        />
        <StatCard
          icon={Sparkles}
          label="Benefit"
          value={benefitLabel.length > 24 ? `${benefitLabel.slice(0, 22)}…` : benefitLabel}
          detail={
            isFlexible
              ? "Flexible plan"
              : String(benefit.type ?? "").replace(/_/g, " ")
          }
          tone="green"
        />
        <StatCard
          icon={Scale}
          label="Tenure"
          value={`${plan.durationMonths} mo`}
          detail={`${plan.installmentCount} ${isFlexible ? "cycles" : "installments"}`}
          tone="cream"
        />
      </div>

      <PlanDetailHero
        displayName={displayName}
        description={description}
        code={String(plan.code)}
        amountLabel={amountLabel}
        benefitLabel={benefitLabel}
        tenureMonths={Number(plan.durationMonths ?? 0)}
        visibleInApp={Boolean(avail.visibleInCustomerApp ?? true)}
        selfEnrol={Boolean(avail.customerSelfEnrolAllowed ?? true)}
        prematureOk={Boolean(redemption.prematureClosureAllowed)}
        lockInMonths={Number(redemption.lockInMonths ?? 0)}
      />

      <PageTabs defaultValue="overview">
        <PageTabsBar sectionLabel="Plan record">
          <PageTab value="overview">
            <ScrollText className="size-4" />
            Overview
          </PageTab>
          <PageTab value="rules">
            <Shield className="size-4" />
            Rules
          </PageTab>
          <PageTab value="stats">
            <BarChart3 className="size-4" />
            Performance
          </PageTab>
        </PageTabsBar>

        <PageTabsPanel value="overview">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
            <div className="space-y-6">
              {isFlexible ? (
                <PlanFlexiblePhaseBar
                  flexibleCycles={flexCycles}
                  cappedCycles={cappedCycles}
                />
              ) : null}
              <PlanSchedulePreviewSurface
                preview={previewState.data}
                loading={previewState.isLoading}
                isFlexible={isFlexible}
              />
              <PlanStaffMetaGrid
                rows={[
                  { label: "Internal name", value: String(plan.name) },
                  { label: "Value basis", value: String(plan.valueBasis).replace(/_/g, " ") },
                  { label: "Payment pattern", value: pattern.replace(/_/g, " ") },
                  { label: "Amount mode", value: String(amountSummary.amountMode ?? "—").replace(/_/g, " ") },
                ]}
              />
              <PlanTermsPanel
                terms={String(plan.termsText ?? "")}
                planId={planId}
                canEdit={!editLocked}
              />
            </div>
            <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
              <PlanPerformanceSidebar
                enrolments={statsData?.enrolments}
                financials={statsData?.financials as Record<string, unknown> | undefined}
                loading={statsQuery.isLoading}
                collectedThisMonth={collectedDisplay}
              />
              <PlanAvailabilitySidebar
                allBranches={Boolean(avail.allBranches ?? true)}
                visibleInApp={Boolean(avail.visibleInCustomerApp ?? true)}
                selfEnrol={Boolean(avail.customerSelfEnrolAllowed ?? true)}
                windowLabel={enrolWindow}
                redemptionModes={redemptionModes}
              />
            </aside>
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="rules">
          <Surface
            title="Financial & redemption rules"
            description="Read-only view of the template configuration"
          >
            <div className="space-y-10 p-6 sm:p-8">
              <RulesSection
                icon={IndianRupee}
                title="Amount rules"
                description="Min, max, slabs, and how customers choose instalment size"
              >
                <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#730321] ring-1 ring-[#e4d7d2]">
                  {amountLabel}
                </p>
                <ContractFieldGrid entries={amountRulesFields(amountRules)} />
              </RulesSection>

              <RulesSection
                icon={CalendarClock}
                title="Schedule"
                description="Due dates and first-instalment behaviour"
              >
                <ContractFieldGrid entries={scheduleRulesFields(scheduleRules)} />
              </RulesSection>

              <RulesSection
                icon={Layers3}
                title="Payments"
                description="Partial payments, advances, and per-transaction limits"
              >
                <ContractFieldGrid entries={paymentRulesFields(paymentRules)} />
              </RulesSection>

              {flexibleRules ? (
                <RulesSection
                  icon={CalendarClock}
                  title="Flexible phases"
                  description="Free window, cap computation, and capped-cycle behaviour"
                >
                  <ContractFieldGrid
                    entries={flexibleRulesFields(flexibleRules)}
                    className="lg:grid-cols-3"
                  />
                </RulesSection>
              ) : null}

              {goldRules && String(plan.valueBasis) === "GOLD_WEIGHT" ? (
                <RulesSection icon={Scale} title="Gold weight" description="Rate and rounding">
                  <ContractFieldGrid entries={goldRulesFields(goldRules)} />
                </RulesSection>
              ) : null}

              <RulesSection icon={Gift} title="Benefit" description="What the customer earns at maturity">
                <ContractFieldGrid entries={benefitFields(benefit)} />
              </RulesSection>

              <RulesSection
                icon={Shield}
                title="Redemption"
                description="Closure, penalties, and settlement modes"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {redemption.prematureClosureAllowed ? "Premature OK" : "Maturity only"}
                  </Badge>
                  {Number(redemption.lockInMonths ?? 0) > 0 ? (
                    <Badge variant="outline">{redemption.lockInMonths} mo lock-in</Badge>
                  ) : null}
                </div>
                <ContractFieldGrid
                  entries={[
                    { label: "Penalty", value: penaltyDisplay(penalty) },
                    {
                      label: "Modes",
                      value:
                        redemptionModes.length > 0
                          ? redemptionModes.map((m) => m.replace(/_/g, " ")).join(" · ")
                          : "—",
                    },
                    {
                      label: "Any branch",
                      value: redemption.redeemAtAnyBranch ? "Yes" : "Home branch only",
                    },
                  ]}
                />
              </RulesSection>

              <RulesSection icon={Store} title="Availability">
                <ContractFieldGrid
                  entries={[
                    {
                      label: "Branches",
                      value: avail.allBranches ? "All branches" : "Selected only",
                    },
                    {
                      label: "Max enrolments",
                      value:
                        avail.maxEnrolments == null
                          ? "Unlimited"
                          : String(avail.maxEnrolments),
                    },
                    { label: "Enrolment window", value: enrolWindow },
                    {
                      label: "Customer app",
                      value: (
                        <YesNo
                          ok={Boolean(avail.visibleInCustomerApp)}
                          yes="Visible"
                          no="Hidden"
                        />
                      ),
                    },
                    {
                      label: "Self-enrol",
                      value: (
                        <YesNo ok={Boolean(avail.customerSelfEnrolAllowed)} />
                      ),
                    },
                  ]}
                />
              </RulesSection>
            </div>
          </Surface>
        </PageTabsPanel>

        <PageTabsPanel value="stats">
          {statsQuery.isLoading ? (
            <PageSkeleton />
          ) : statsQuery.isError || !statsQuery.data ? (
            <QueryError onRetry={statsQuery.refetch} />
          ) : (
            <PlanPerformanceTab
              enrolments={statsData?.enrolments}
              financials={statsData?.financials as Record<string, unknown>}
              charts={
                statsData?.charts as Record<
                  string,
                  import("@/src/types/admin-report").ChartSeriesBlock
                >
              }
            />
          )}
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
