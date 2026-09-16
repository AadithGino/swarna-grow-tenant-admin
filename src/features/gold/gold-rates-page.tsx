"use client";

/* The generic table renderer signature receives a row for every column. */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Plus,
  Scale,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { toastApiError } from "@/src/lib/api-error";
import {
  goldRateFormReady,
  liveGoldRatePerGramError,
  validateGoldEffectiveDate,
  validateGoldRatePerGram,
} from "@/src/lib/gold-rate-form-validation";
import { businessTodayYmd } from "@/src/lib/list-date-range";
import { cn } from "@/lib/utils";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  FieldLabel,
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { idempotencyKey, money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  useAddGoldRateMutation,
  useGetBranchesQuery,
  useGetGoldRateCurrentQuery,
  useGetGoldRatesQuery,
} from "@/src/store/api/admin-api";

function trendLabel(row: {
  effectiveDate?: string | null;
  effectiveAt: string;
}) {
  if (row.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(row.effectiveDate)) {
    const d = new Date(`${row.effectiveDate}T12:00:00`);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(row.effectiveAt)) {
    const d = new Date(`${row.effectiveAt.slice(0, 10)}T12:00:00`);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return row.effectiveAt.slice(0, 12);
}

export function GoldRatesPage() {
  const actingBranchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(8, `gold-history|${branchKey}`);
  const query = useGetGoldRatesQuery({
    branchId: actingBranchId,
    ...pager.queryParams,
  });
  const currentQuery = useGetGoldRateCurrentQuery(
    actingBranchId ? { branchId: actingBranchId } : undefined,
  );
  const { data: branchesData } = useGetBranchesQuery({ limit: 100 });
  const branches = branchesData?.items ?? [];
  const [addRate] = useAddGoldRateMutation();
  const [rate, setRate] = useState(7225);
  const [branch, setBranch] = useState("ALL");
  const [rateTouched, setRateTouched] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const effectiveDate = businessTodayYmd();
  const rateError =
    rateTouched || rate > 0 ? liveGoldRatePerGramError(rate) : undefined;

  useEffect(() => {
    setBranch(actingBranchId ?? "ALL");
  }, [actingBranchId]);

  const history = query.data?.history ?? [];
  const page = query.data?.page ?? emptyPageMeta();
  const historyCurrent = query.data?.current;
  const liveCurrent = currentQuery.data;
  const current = {
    ratePerGram:
      liveCurrent?.ratePerGram ?? historyCurrent?.ratePerGram ?? 0,
    effectiveAt:
      liveCurrent?.effectiveAt ?? historyCurrent?.effectiveAt ?? "—",
    branch: historyCurrent?.branch ?? "All branches",
    enteredBy: historyCurrent?.enteredBy ?? "—",
    isSetForToday:
      liveCurrent?.isSetForToday ?? historyCurrent?.isSetForToday ?? false,
  };

  const trend = useMemo(
    () =>
      [...history]
        .reverse()
        .slice(-14)
        .map(
          (r: {
            effectiveAt: string;
            ratePerGram: number;
            effectiveDate?: string | null;
          }) => ({
            day: trendLabel(r),
            rate: r.ratePerGram,
          }),
        ),
    [history],
  );

  const previous =
    (history[1] as { ratePerGram?: number } | undefined)?.ratePerGram ??
    current.ratePerGram;
  const change = current.ratePerGram - previous;
  const changePct =
    previous > 0 ? Math.abs((change / previous) * 100).toFixed(2) : "0.00";

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;

  return (
    <>
      <PageHeader
        eyebrow="Money & fulfilment"
        title="Gold rates"
        description="Daily rates for gold-weight scheme payments and liability calculations."
        actions={
          <ActionDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setRateTouched(false);
            }}
            trigger={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus />
                Add gold rate
              </Button>
            }
            title="Set gold rate"
            description="The new rate is immutable and becomes effective on the business date below (IST)."
            actionLabel="Publish rate"
            submitDisabled={!goldRateFormReady(rate, effectiveDate)}
            onSubmit={async () => {
              setRateTouched(true);
              const rateErr = validateGoldRatePerGram(rate);
              const dateErr = validateGoldEffectiveDate(effectiveDate);
              if (rateErr || dateErr) {
                toast.error(rateErr ?? dateErr);
                return false;
              }
              try {
                await addRate({
                  ratePerGram: rate,
                  branch,
                  idempotencyKey: idempotencyKey(),
                }).unwrap();
                toast.success("Gold rate published");
                setDialogOpen(false);
              } catch (err) {
                toastApiError(err, "Could not publish gold rate");
                return false;
              }
            }}
          >
            <div className="grid gap-4">
              <div>
                <FieldLabel>Effective date</FieldLabel>
                <Input
                  value={effectiveDate}
                  readOnly
                  className="h-11 bg-muted/40 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Published rates use today&apos;s business date (YYYY-MM-DD).
                </p>
              </div>
              <div>
                <FieldLabel>Rate per gram</FieldLabel>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={rate || ""}
                  onChange={(e) => {
                    setRateTouched(true);
                    setRate(Number(e.target.value));
                  }}
                  className={cn(
                    "h-12 text-lg font-bold",
                    rateError && "border-red-600",
                  )}
                  aria-invalid={Boolean(rateError)}
                />
                <FormFieldError message={rateError} />
              </div>
              <div>
                <FieldLabel>Applies to</FieldLabel>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All branches</SelectItem>
                    {branches.map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-[#e9d8ab] bg-[#fff9e9] p-4 text-sm">
                Payments on gold-weight plans use the latest effective rate for
                the customer&apos;s branch (branch-specific rate, else
                tenant-wide rate).
              </div>
            </div>
          </ActionDialog>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Scale}
          label="Current rate / gram"
          value={money(current.ratePerGram)}
          detail={`${current.branch} · ${current.effectiveAt}${current.isSetForToday ? " · set for today" : ""}`}
        />
        <StatCard
          icon={change >= 0 ? ArrowUpRight : ArrowDownRight}
          label="Change from previous"
          value={`${change >= 0 ? "+" : ""}${money(change)}`}
          detail={`${changePct}% movement`}
          tone={change >= 0 ? "green" : "red"}
        />
        <StatCard
          icon={Clock3}
          label="Last updated by"
          value={current.enteredBy}
          detail={current.effectiveAt}
          tone="cream"
        />
      </div>
      <Surface title="Rate trend" description="Last 14 entries in scope">
        <div className="h-[360px] p-5">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rate history in this branch scope yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 8, right: 20 }}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#730321" stopOpacity={0.22} />
                    <stop offset="1" stopColor="#730321" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eadfda" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["dataMin - 80", "dataMax + 80"]}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => money(Number(v))}
                />
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#730321"
                  strokeWidth={3}
                  fill="url(#rateFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Surface>
      <Surface title="Rate history" description="Immutable audit trail">
        <PaginatedDataTable
          rows={history}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          columns={[
            {
              key: "date",
              header: "Effective at",
              render: (r) => r.effectiveAt,
            },
            {
              key: "rate",
              header: "Rate / gram",
              render: (r) => <strong>{money(r.ratePerGram)}</strong>,
            },
            { key: "branch", header: "Scope", render: (r) => r.branch },
            { key: "by", header: "Entered by", render: (r) => r.enteredBy },
            {
              key: "diff",
              header: "Movement",
              render: (r) => {
                if (r.movement == null)
                  return <span className="text-muted-foreground">—</span>;
                const up = r.movement >= 0;
                return (
                  <span className={up ? "text-emerald-700" : "text-red-700"}>
                    {up ? "+" : ""}
                    {money(r.movement)}
                  </span>
                );
              },
            },
          ]}
        />
      </Surface>
    </>
  );
}
