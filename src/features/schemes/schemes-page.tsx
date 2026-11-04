"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FilePlus2,
  IndianRupee,
  Landmark,
  LayoutGrid,
  List,
  LockKeyhole,
  Plus,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroStat, SectionHero, heroButtonClass, heroPrimaryButtonClass } from "@/src/components/admin-ui/section-hero";
import { ListPanel } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { PlanCard } from "@/src/features/schemes/plan-card";
import type { SchemePlan } from "@/src/types/domain";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { toastApiError } from "@/src/lib/api-error";
import { validateQuickPlanDraft } from "@/src/lib/plan-builder-validation";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { FieldLabel } from "@/src/components/common/page-parts";

import { PlanRowActions } from "@/src/features/schemes/plan-row-actions";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import {
  useActivatePlanMutation,
  useCreatePlanMutation,
  useDeactivatePlanMutation,
  useDuplicatePlanMutation,
  useGetPlansQuery,
  usePreviewPlanScheduleMutation,
} from "@/src/store/api/admin-api";
import {
  buildPlanCreatePayload,
  buildPreviewScheduleBody,
  defaultPlanBuilderForm,
} from "@/src/features/schemes/plan-builder-form";
import { PlanSchedulePreviewPanel } from "@/src/features/schemes/plan-preview-panel";

export function SchemesPage() {
  const router = useRouter();
  const [createPlan] = useCreatePlanMutation();
  const [duplicatePlan] = useDuplicatePlanMutation();
  const [activatePlan] = useActivatePlanMutation();
  const [deactivatePlan] = useDeactivatePlanMutation();
  const [previewSchedule, previewState] = usePreviewPlanScheduleMutation();
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [valueBasis, setValueBasis] = useState("ALL");
  const [paymentPattern, setPaymentPattern] = useState("ALL");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const pager = useCursorPagination(
    8,
    `${status}|${valueBasis}|${paymentPattern}|${debouncedQ}`,
  );
  const queryArgs = useMemo(
    () => ({
      q: listSearchQueryForApi(debouncedQ),
      status:
        status === "ALL"
          ? undefined
          : status === "ARCHIVED"
            ? "INACTIVE"
            : status,
      valueBasis: valueBasis === "ALL" ? undefined : valueBasis,
      paymentPattern:
        paymentPattern === "ALL"
          ? undefined
          : paymentPattern === "FIXED_DATE"
            ? "FIXED"
            : "FLEXIBLE",
      ...pager.queryParams,
    }),
    [status, valueBasis, paymentPattern, debouncedQ, pager.queryParams],
  );
  const query = useGetPlansQuery(queryArgs, {
    skip: shouldSkipListSearchQuery(debouncedQ),
  });
  const [form, setForm] = useState({
    name: "",
    code: "",
    valueBasis: "CASH",
    paymentPattern: "FIXED_DATE",
    tenure: 12,
    amount: 3000,
  });
  const [quickPlanErrors, setQuickPlanErrors] = useState<
    Record<string, string>
  >({});
  const [previewError, setPreviewError] = useState<string | undefined>();
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;
  const rows = query.data.items;
  const page = query.data.page ?? emptyPageMeta();
  const s = query.data.summary;

  const statusFilters = [
    { value: "ALL", label: "All plans" },
    { value: "ACTIVE", label: "Active" },
    { value: "DRAFT", label: "Draft" },
    { value: "ARCHIVED", label: "Archived" },
  ] as const;

  const handleDuplicate = async (
    id: string,
    options?: { openEditor?: boolean },
  ) => {
    if (options?.openEditor) {
      router.push(`/schemes/${id}/duplicate`);
      return;
    }
    try {
      const copy = await duplicatePlan(id).unwrap();
      toast.success(`${copy.name ?? copy.code} duplicated`);
    } catch {
      toast.error("Could not duplicate plan");
    }
  };
  const handleActivate = async (id: string) => {
    const row = await activatePlan(id).unwrap();
    toast.success(`${row.name} activated`);
  };
  const handleDeactivate = async (id: string) => {
    const row = await deactivatePlan(id).unwrap();
    toast.success(`${row.name} deactivated`);
  };

  const activeFilters = [
    ...(status !== "ALL"
      ? [{ key: "status", label: statusFilters.find((f) => f.value === status)?.label ?? status, onClear: () => setStatus("ALL") }]
      : []),
    ...(valueBasis !== "ALL"
      ? [{ key: "basis", label: valueBasis === "CASH" ? "Cash value" : "Gold weight", onClear: () => setValueBasis("ALL") }]
      : []),
    ...(paymentPattern !== "ALL"
      ? [{ key: "pattern", label: paymentPattern === "FIXED_DATE" ? "Fixed date" : "Flexible", onClear: () => setPaymentPattern("ALL") }]
      : []),
    ...(q.trim() ? [{ key: "q", label: `“${q.trim()}”`, onClear: () => setQ("") }] : []),
  ];
  const maxEnrollments = Math.max(1, ...rows.map((r: SchemePlan) => Number(r.activeEnrollments ?? 0)));

  return (
    <>
      <SectionHero
        icon={Landmark}
        eyebrow="Gold schemes"
        title="Scheme plans"
        description="The monthly savings plans customers join. Build a plan once, preview its schedule, and every enrollment follows the same rules. Duplicate an existing plan to reuse it as a template."
        actions={
          <PermissionGate permission={ACTION.planWrite}>
            <Link href="/schemes/new" className={heroPrimaryButtonClass} data-tour="schemes-builder">
              <Plus className="size-4" aria-hidden />
              Plan builder
            </Link>
            <ActionDialog
            trigger={
              <button type="button" className={heroButtonClass}>
                <FilePlus2 className="size-4" aria-hidden />
                Quick draft
              </button>
            }
            title="New scheme plan"
            description="Creates a draft. Complete benefit and redemption rules before publishing."
            actionLabel="Create draft"
            submitDisabled={
              Object.keys(validateQuickPlanDraft(form)).length > 0
            }
            onSubmit={async () => {
              const clientErrors = validateQuickPlanDraft(form);
              if (Object.keys(clientErrors).length) {
                setQuickPlanErrors(clientErrors);
                toast.error("Fix the highlighted fields.");
                return false;
              }
              const draft = defaultPlanBuilderForm();
              draft.name = form.name.trim();
              draft.code = form.code.trim().toUpperCase();
              draft.displayName = form.name.trim();
              draft.valueBasis = form.valueBasis as "CASH" | "GOLD_WEIGHT";
              draft.paymentPattern = form.paymentPattern as
                | "FIXED_DATE"
                | "FLEXIBLE_AVERAGE";
              draft.durationMonths = form.tenure;
              draft.installmentCount = form.tenure;
              draft.fixedAmount = form.amount;
              draft.minAmount = form.amount;
              draft.maxAmount = Math.max(form.amount * 10, form.amount);
              try {
                await createPlan(buildPlanCreatePayload(draft) as any).unwrap();
                toast.success("Scheme draft created");
              } catch (err) {
                toastApiError(err, "Could not create scheme draft");
                return false;
              }
            }}
          >
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Plan name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setQuickPlanErrors((p) => {
                        const n = { ...p };
                        delete n.name;
                        return n;
                      });
                    }}
                    placeholder="Akshaya 12 Month"
                    className={cn(quickPlanErrors.name && "border-red-600")}
                    aria-invalid={Boolean(quickPlanErrors.name)}
                  />
                  <FormFieldError message={quickPlanErrors.name} />
                </div>
                <div>
                  <FieldLabel>Plan code</FieldLabel>
                  <Input
                    value={form.code}
                    onChange={(e) => {
                      setForm({ ...form, code: e.target.value.toUpperCase() });
                      setQuickPlanErrors((p) => {
                        const n = { ...p };
                        delete n.code;
                        return n;
                      });
                    }}
                    placeholder="AKS12"
                    className={cn(quickPlanErrors.code && "border-red-600")}
                    aria-invalid={Boolean(quickPlanErrors.code)}
                  />
                  <FormFieldError message={quickPlanErrors.code} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Value basis</FieldLabel>
                  <Select
                    value={form.valueBasis}
                    onValueChange={(v) => setForm({ ...form, valueBasis: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="GOLD_WEIGHT">Gold weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Payment pattern</FieldLabel>
                  <Select
                    value={form.paymentPattern}
                    onValueChange={(v) =>
                      setForm({ ...form, paymentPattern: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED_DATE">Fixed date</SelectItem>
                      <SelectItem value="FLEXIBLE_AVERAGE">
                        Flexible average
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Tenure (months)</FieldLabel>
                  <Input
                    type="number"
                    value={form.tenure}
                    onChange={(e) => {
                      setForm({ ...form, tenure: Number(e.target.value) });
                      setQuickPlanErrors((p) => {
                        const n = { ...p };
                        delete n.tenure;
                        return n;
                      });
                    }}
                    className={cn(quickPlanErrors.tenure && "border-red-600")}
                    aria-invalid={Boolean(quickPlanErrors.tenure)}
                  />
                  <FormFieldError message={quickPlanErrors.tenure} />
                </div>
                <div>
                  <FieldLabel>Default amount</FieldLabel>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => {
                      setForm({ ...form, amount: Number(e.target.value) });
                      setQuickPlanErrors((p) => {
                        const n = { ...p };
                        delete n.amount;
                        return n;
                      });
                    }}
                    className={cn(quickPlanErrors.amount && "border-red-600")}
                    aria-invalid={Boolean(quickPlanErrors.amount)}
                  />
                  <FormFieldError message={quickPlanErrors.amount} />
                </div>
              </div>
              <div className="rounded-xl border bg-[#fff8e8] p-4 text-sm">
                Plan editing is restricted after the first enrollment. Duplicate
                a live plan to create a new version.
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const clientErrors = validateQuickPlanDraft(form);
                  if (Object.keys(clientErrors).length) {
                    setQuickPlanErrors(clientErrors);
                    toast.error("Fix the highlighted fields.");
                    return;
                  }
                  const draft = defaultPlanBuilderForm();
                  draft.name = form.name.trim();
                  draft.code = form.code.trim().toUpperCase();
                  draft.valueBasis = form.valueBasis as "CASH" | "GOLD_WEIGHT";
                  draft.paymentPattern = form.paymentPattern as
                    | "FIXED_DATE"
                    | "FLEXIBLE_AVERAGE";
                  draft.durationMonths = form.tenure;
                  draft.installmentCount = form.tenure;
                  draft.fixedAmount = form.amount;
                  draft.minAmount = form.amount;
                  try {
                    const res = await previewSchedule(
                      buildPreviewScheduleBody(draft),
                    ).unwrap();
                    setPreviewError(undefined);
                    const firstDue =
                      res.summary.firstDueDate ??
                      res.summary.freeWindow?.from ??
                      "—";
                    toast.message(
                      `Preview: maturity ${res.summary.maturityDate ?? "—"} · first ${firstDue}`,
                    );
                  } catch (err) {
                    setPreviewError(
                      toastApiError(err, "Could not preview schedule"),
                    );
                  }
                }}
              >
                Preview schedule
              </Button>
              <PlanSchedulePreviewPanel
                data={previewState.data}
                error={previewError}
              />
            </div>
          </ActionDialog>
          </PermissionGate>
        }
      >
        <HeroStat label="Active plans" value={s.active} detail="Open for new enrollments" />
        <HeroStat label="Drafts" value={s.draft} detail="Not visible to customers" />
        <HeroStat label="Active enrollments" value={Number(s.enrollments ?? 0).toLocaleString("en-IN")} detail="Across every plan" href="/enrollments" />
        <HeroStat label="Monthly plan value" value={money(s.monthlyValue)} detail="Expected instalments a month" />
      </SectionHero>

      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={status}
                onChange={setStatus}
                options={statusFilters.map((f) => ({ value: f.value, label: f.label }))}
                ariaLabel="Filter by plan status"
              />
            }
            search={<FilterSearch value={q} onChange={setQ} placeholder="Plan name or code" />}
            filters={
              <>
                <FilterSelect
                  label="Value"
                  value={valueBasis}
                  onChange={setValueBasis}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "CASH", label: "Cash" },
                    { value: "GOLD_WEIGHT", label: "Gold weight" },
                  ]}
                />
                <FilterSelect
                  label="Pattern"
                  value={paymentPattern}
                  onChange={setPaymentPattern}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "FIXED_DATE", label: "Fixed date" },
                    { value: "FLEXIBLE_AVERAGE", label: "Flexible" },
                  ]}
                />
              </>
            }
            actions={
              <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-xl border border-[#e6dad6] bg-white p-1">
                {(
                  [
                    ["cards", LayoutGrid, "Cards"],
                    ["table", List, "Table"],
                  ] as const
                ).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={view === key}
                    aria-label={`${label} view`}
                    onClick={() => setView(key)}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition-colors",
                      view === key ? "bg-[#5e0a20] text-white" : "text-[#7a6d70] hover:text-[#28161a]",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            }
            activeFilters={activeFilters}
            onClearAll={() => {
              setStatus("ALL");
              setValueBasis("ALL");
              setPaymentPattern("ALL");
              setQ("");
            }}
            resultLabel={`${rows.length} plan${rows.length === 1 ? "" : "s"}${page.hasMore ? "+" : ""}`}
          />
        }
      >
        {view === "table" ? (
          <PaginatedDataTable
            rows={rows}
            page={page}
            pageIndex={pager.pageIndex}
            onNext={() => pager.goNext(page.nextCursor)}
            onPrevious={pager.goPrevious}
            canPrevious={pager.canPrevious}
            onRowClick={(r: { id: string }) => router.push(`/schemes/${r.id}`)}
            columns={[
              {
                key: "plan",
                header: "Plan",
                className: "min-w-[200px]",
                render: (r: any) => (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate">{r.name}</strong>
                      {r.editLocked ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-300 bg-amber-50 text-[0.65rem] text-amber-900"
                        >
                          <LockKeyhole className="size-3" />
                          Locked
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.code}</p>
                  </div>
                ),
              },
              {
                key: "basis",
                header: "Basis",
                className: "hidden md:table-cell whitespace-nowrap",
                render: (r: any) => (
                  <span className="inline-flex items-center gap-2 text-sm">
                    {r.valueBasis === "GOLD_WEIGHT" ? (
                      <Scale className="size-4 shrink-0 text-[#9a6f2a]" />
                    ) : (
                      <IndianRupee className="size-4 shrink-0 text-[#9a6f2a]" />
                    )}
                    <span className="hidden lg:inline">
                      {r.valueBasis.replaceAll("_", " ")}
                    </span>
                  </span>
                ),
              },
              {
                key: "pattern",
                header: "Pattern",
                className: "hidden lg:table-cell whitespace-nowrap text-sm",
                render: (r: any) =>
                  r.paymentPattern.replaceAll("_", " ").replace("DATE", "date"),
              },
              {
                key: "tenure",
                header: "Tenure",
                render: (r: any) => `${r.tenure ?? "—"} months`,
              },
              {
                key: "display",
                header: "Display name",
                className: "hidden xl:table-cell text-sm text-muted-foreground",
                render: (r: any) => r.displayName ?? r.name,
              },
              {
                key: "amount",
                header: "From",
                render: (r: any) => money(r.amount),
              },
              {
                key: "enrollments",
                header: "Enrollments",
                render: (r: any) => r.activeEnrollments,
              },
              {
                key: "status",
                header: "Status",
                render: (r: any) => <StatusBadge status={r.status} />,
              },
              {
                key: "action",
                header: "",
                className: "w-[1%] whitespace-nowrap text-right",
                render: (r: any) => (
                  <PermissionGate
                    permission={ACTION.planWrite}
                    fallback={
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/schemes/${r.id}`}>View</Link>
                      </Button>
                    }
                  >
                    <PlanRowActions
                      plan={r}
                      onDuplicate={handleDuplicate}
                      onActivate={handleActivate}
                      onDeactivate={handleDeactivate}
                    />
                  </PermissionGate>
                ),
              },
            ]}
        />
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#857a7d]">
            No plans match these filters.
          </p>
        ) : (
          <>
            <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
              {rows.map((plan: SchemePlan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  share={Number(plan.activeEnrollments ?? 0) / maxEnrollments}
                  actions={
                    <PermissionGate
                      permission={ACTION.planWrite}
                      fallback={
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/schemes/${plan.id}`}>View</Link>
                        </Button>
                      }
                    >
                      <PlanRowActions
                        plan={plan}
                        onDuplicate={handleDuplicate}
                        onActivate={handleActivate}
                        onDeactivate={handleDeactivate}
                      />
                    </PermissionGate>
                  }
                />
              ))}
            </div>
            <CursorPagination
              page={page}
              pageIndex={pager.pageIndex}
              rowCount={rows.length}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
            />
          </>
        )}
      </ListPanel>
    </>
  );
}
