"use client";

import Link from "next/link";
import { PortalBackLink } from "@/src/components/common/portal-back-link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Copy,
  Gift,
  IndianRupee,
  Layers3,
  MoreHorizontal,
  Pencil,
  Scale,
  ScrollText,
  Shield,
  Smartphone,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
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
  PlanChannelPanel,
  PlanCustomerPreviewCard,
  PlanDetailBanner,
  PlanEnrolmentPulse,
  PlanFlexiblePhaseBar,
  PlanInternalMetaCard,
  PlanPerformanceDashboard,
  PlanRuleCard,
  PlanRulesWorkspace,
  PlanScheduleSection,
  PlanStatusAlert,
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
} from "@/src/features/schemes/plan-contract-fields";
import {
  amountSummaryLabel,
  planDetailToForm,
} from "@/src/features/schemes/plan-builder-form";
import {
  cashSettlementBasisLabel,
  planShowsCashSettlementBasis,
  resolveCashSettlementBasis,
  resolvePaidAmountBenefitTreatment,
} from "@/src/lib/cash-settlement-basis";
import { PlanAvailabilityDialog } from "@/src/features/schemes/plan-availability-dialog";

export function PlanDetailPage({ planId }: { planId: string }) {
  const router = useRouter();
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [activeRuleSection, setActiveRuleSection] = useState("rules-amount");
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

  const ruleSections = useMemo(() => {
    const planData = planQuery.data as Record<string, unknown> | undefined;
    const flexibleRules = (planData?.flexibleRules ?? null) as Record<string, unknown> | null;
    const goldRules = (planData?.goldRules ?? null) as Record<string, unknown> | null;
    const valueBasis = String(planData?.valueBasis ?? "");

    const sections = [
      { id: "rules-amount", label: "Amount rules", icon: IndianRupee },
      { id: "rules-schedule", label: "Schedule", icon: CalendarClock },
      { id: "rules-payments", label: "Payments", icon: Layers3 },
    ];
    if (flexibleRules) {
      sections.push({ id: "rules-flexible", label: "Flexible phases", icon: CalendarClock });
    }
    if (goldRules && valueBasis === "GOLD_WEIGHT") {
      sections.push({ id: "rules-gold", label: "Gold weight", icon: Scale });
    }
    sections.push(
      { id: "rules-benefit", label: "Benefit", icon: Gift },
      { id: "rules-redemption", label: "Redemption", icon: Shield },
      { id: "rules-availability", label: "Availability", icon: Store },
    );
    return sections;
  }, [planQuery.data]);

  const resolvedActiveRuleSection = ruleSections.some(
    (section) => section.id === activeRuleSection,
  )
    ? activeRuleSection
    : (ruleSections[0]?.id ?? "rules-amount");

  if (planQuery.isLoading) return <PageSkeleton cards={4} />;
  if (planQuery.isError || !planQuery.data)
    return (
      <QueryError
        onRetry={planQuery.refetch}
        title="Scheme plan could not be loaded"
        error={planQuery.error}
      />
    );

  const plan = planQuery.data as Record<string, unknown>;
  const amountRules = (plan.amountRules ?? {}) as Record<string, unknown>;
  const scheduleRules = plan.scheduleRules as Record<string, unknown> | null;
  const paymentRules = (plan.paymentRules ?? {}) as Record<string, unknown>;
  const flexibleRules = (plan.flexibleRules ?? null) as Record<string, unknown> | null;
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
  const internalName = String(plan.name ?? displayName);
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
  const showCashBasisOnPlan = planShowsCashSettlementBasis(
    String(plan.valueBasis ?? ""),
    redemptionModes,
  );
  const effectiveCashBasis = resolveCashSettlementBasis(redemption);
  const effectiveBenefitTreatment =
    resolvePaidAmountBenefitTreatment(redemption);
  const flexCycles = Number(flexibleRules?.flexiblePhaseCycles ?? 6);
  const cappedCycles = Number(flexibleRules?.cappedPhaseCycles ?? 5);
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
  const maxEnrolments =
    avail.maxEnrolments == null ? "Unlimited" : String(avail.maxEnrolments);
  const activeRuleIndex = ruleSections.findIndex(
    (section) => section.id === resolvedActiveRuleSection,
  );
  const ruleSectionMeta = {
    sectionIndex: activeRuleIndex >= 0 ? activeRuleIndex + 1 : undefined,
    sectionTotal: ruleSections.length || undefined,
  };

  const actionMenu = (
    <PermissionGate permission={ACTION.planWrite}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setAvailabilityOpen(true)}>
          <Smartphone />
          App & availability
        </Button>
        {editLocked ? (
          <Button onClick={() => router.push(`/schemes/${planId}/duplicate`)}>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {status === "DRAFT" ? (
              <DropdownMenuItem
                onClick={async () => {
                  await activatePlan(planId).unwrap();
                  toast.success(`${displayName} is now active`);
                }}
              >
                Activate plan
              </DropdownMenuItem>
            ) : status === "ACTIVE" ? (
              <DropdownMenuItem
                className="text-red-700 focus:text-red-700"
                onClick={async () => {
                  await deactivatePlan(planId).unwrap();
                  toast.success(`${displayName} deactivated`);
                }}
              >
                Deactivate plan
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={async () => {
                try {
                  const copy = await duplicatePlan(planId).unwrap();
                  toast.success(`${copy.code} duplicated`);
                } catch {
                  toast.error("Could not duplicate plan");
                }
              }}
            >
              <Copy className="size-4" />
              Duplicate plan
            </DropdownMenuItem>
            {!editLocked ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/schemes/${planId}/edit`}>
                    <Pencil className="size-4" />
                    Open in editor
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </PermissionGate>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PortalBackLink fallbackHref="/schemes">
          <ArrowLeft className="size-4" />
          Back
        </PortalBackLink>
        {actionMenu}
      </div>

      <PlanDetailBanner
        displayName={displayName}
        internalName={internalName}
        description={description}
        code={String(plan.code)}
        status={status}
        version={Number(plan.version ?? 1)}
        editLocked={editLocked}
        pattern={pattern}
        valueBasis={String(plan.valueBasis)}
        amountLabel={amountLabel}
        benefitLabel={benefitLabel}
        tenureMonths={Number(plan.durationMonths ?? 0)}
        installmentCount={Number(plan.installmentCount ?? 0)}
        activeSchemes={activeSchemes}
        totalEnrolments={totalEnrolments}
        visibleInApp={Boolean(avail.visibleInCustomerApp)}
        selfEnrol={Boolean(avail.customerSelfEnrolAllowed)}
      />

      {editLocked ? (
        <PlanStatusAlert
          variant="locked"
          activeSchemes={activeSchemes}
          onEditAvailability={() => setAvailabilityOpen(true)}
        />
      ) : status === "DRAFT" ? (
        <PlanStatusAlert variant="draft" />
      ) : status === "ACTIVE" ? (
        <PlanStatusAlert variant="active" />
      ) : null}

      <PageTabs defaultValue="overview">
        <PageTabsBar sectionLabel="Plan workspace">
          <PageTab value="overview">
            <ScrollText className="size-4" />
            Overview
          </PageTab>
          <PageTab value="schedule">
            <CalendarClock className="size-4" />
            Schedule
          </PageTab>
          <PageTab value="rules">
            <Shield className="size-4" />
            Rules
          </PageTab>
          <PageTab value="performance">
            <BarChart3 className="size-4" />
            Performance
          </PageTab>
        </PageTabsBar>

        <PageTabsPanel value="overview">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="space-y-6">
              <PlanCustomerPreviewCard
                displayName={displayName}
                amountLabel={amountLabel}
                benefitLabel={benefitLabel}
                tenureMonths={Number(plan.durationMonths ?? 0)}
                prematureOk={Boolean(redemption.prematureClosureAllowed)}
                lockInMonths={Number(redemption.lockInMonths ?? 0)}
                redemptionModes={redemptionModes}
              />
              <PlanInternalMetaCard
                rows={[
                  { label: "Internal name", value: internalName },
                  { label: "Value basis", value: String(plan.valueBasis).replace(/_/g, " ") },
                  { label: "Payment pattern", value: pattern.replace(/_/g, " ") },
                  {
                    label: "Amount mode",
                    value: String(amountSummary.amountMode ?? "—").replace(/_/g, " "),
                  },
                ]}
              />
              <PlanTermsPanel
                terms={String(plan.termsText ?? "")}
                planId={planId}
                canEdit={!editLocked}
              />
            </div>
            <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
              <PlanEnrolmentPulse
                enrolments={statsData?.enrolments}
                financials={statsData?.financials as Record<string, unknown> | undefined}
                loading={statsQuery.isLoading}
                collectedThisMonth={collectedDisplay}
              />
              <PlanChannelPanel
                allBranches={Boolean(avail.allBranches ?? true)}
                visibleInApp={Boolean(avail.visibleInCustomerApp)}
                selfEnrol={Boolean(avail.customerSelfEnrolAllowed)}
                windowLabel={enrolWindow}
                maxEnrolments={maxEnrolments}
                redemptionModes={redemptionModes}
                action={
                  <PermissionGate permission={ACTION.planWrite}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[#730321]"
                      onClick={() => setAvailabilityOpen(true)}
                    >
                      Edit
                    </Button>
                  </PermissionGate>
                }
              />
            </aside>
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="schedule">
          <div className="space-y-6">
            {isFlexible ? (
              <PlanFlexiblePhaseBar
                flexibleCycles={flexCycles}
                cappedCycles={cappedCycles}
              />
            ) : null}
            <PlanScheduleSection
              preview={previewState.data}
              loading={previewState.isLoading}
              isFlexible={isFlexible}
            />
          </div>
        </PageTabsPanel>

        <PageTabsPanel value="rules" flush>
          <PlanRulesWorkspace
            sections={ruleSections}
            activeId={resolvedActiveRuleSection}
            onSelect={setActiveRuleSection}
          >
            {resolvedActiveRuleSection === "rules-amount" ? (
              <PlanRuleCard
                id="rules-amount"
                icon={IndianRupee}
                title="Amount rules"
                description="Minimums, maximums, slabs, and how customers choose instalment size"
                highlight={amountLabel}
                entries={amountRulesFields(amountRules)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-schedule" ? (
              <PlanRuleCard
                id="rules-schedule"
                icon={CalendarClock}
                title="Schedule"
                description="Due dates, grace period, and first-instalment behaviour"
                entries={scheduleRulesFields(scheduleRules)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-payments" ? (
              <PlanRuleCard
                id="rules-payments"
                icon={Layers3}
                title="Payments"
                description="Partial payments, advances, and per-transaction limits"
                entries={paymentRulesFields(paymentRules)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-flexible" && flexibleRules ? (
              <PlanRuleCard
                id="rules-flexible"
                icon={CalendarClock}
                title="Flexible phases"
                description="Free window, cap computation, and capped-cycle behaviour"
                entries={flexibleRulesFields(flexibleRules)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-gold" &&
            goldRules &&
            String(plan.valueBasis) === "GOLD_WEIGHT" ? (
              <PlanRuleCard
                id="rules-gold"
                icon={Scale}
                title="Gold weight"
                description="Rate source and rounding for weight-based plans"
                entries={goldRulesFields(goldRules)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-benefit" ? (
              <PlanRuleCard
                id="rules-benefit"
                icon={Gift}
                title="Benefit"
                description="What the customer earns at maturity"
                entries={benefitFields(benefit)}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-redemption" ? (
              <PlanRuleCard
                id="rules-redemption"
                icon={Shield}
                title="Redemption"
                description="Closure rules, penalties, and settlement modes"
                badges={
                  <>
                    <Badge variant="outline">
                      {redemption.prematureClosureAllowed ? "Premature OK" : "Maturity only"}
                    </Badge>
                    {Number(redemption.lockInMonths ?? 0) > 0 ? (
                      <Badge variant="outline">
                        {String(redemption.lockInMonths)} mo lock-in
                      </Badge>
                    ) : null}
                  </>
                }
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
                  ...(showCashBasisOnPlan
                    ? [
                        {
                          label: "Cash payout basis",
                          value: cashSettlementBasisLabel(effectiveCashBasis),
                        },
                        ...(effectiveCashBasis === "PAID_AMOUNT"
                          ? [
                              {
                                label: "Monetary benefit in cash",
                                value:
                                  effectiveBenefitTreatment ===
                                  "INCLUDE_MONETARY"
                                    ? "Include when eligible"
                                    : "Exclude (contributions only)",
                              },
                            ]
                          : []),
                        {
                          label: "Enrolment note",
                          value:
                            "Existing enrolments keep the rule frozen in their plan snapshot.",
                        },
                      ]
                    : []),
                ]}
                {...ruleSectionMeta}
              />
            ) : null}
            {resolvedActiveRuleSection === "rules-availability" ? (
              <PlanRuleCard
                id="rules-availability"
                icon={Store}
                title="Availability"
                description="Where and how customers can enrol on this plan"
                entries={[
                  {
                    label: "Branches",
                    value: avail.allBranches ? "All branches" : "Selected only",
                  },
                  { label: "Max enrolments", value: maxEnrolments },
                  { label: "Enrolment window", value: enrolWindow },
                  {
                    label: "Customer app",
                    value: avail.visibleInCustomerApp ? "Visible" : "Hidden",
                  },
                  {
                    label: "Self-enrol",
                    value: avail.customerSelfEnrolAllowed ? "Allowed" : "Staff only",
                  },
                ]}
                {...ruleSectionMeta}
              />
            ) : null}
          </PlanRulesWorkspace>
        </PageTabsPanel>

        <PageTabsPanel value="performance">
          {statsQuery.isLoading ? (
            <PageSkeleton />
          ) : statsQuery.isError || !statsQuery.data ? (
            <QueryError error={statsQuery.error} onRetry={statsQuery.refetch} />
          ) : (
            <PlanPerformanceDashboard
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

      <PlanAvailabilityDialog
        key={`${planId}-${String(plan.version ?? 1)}`}
        plan={plan}
        planId={planId}
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
      />
    </div>
  );
}
