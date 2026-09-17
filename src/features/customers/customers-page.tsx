"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { CustomersAnalyticsTab } from "@/src/features/customers/customers-analytics-tab";
import {
  Download,
  Gift,
  MoreVertical,
  Upload,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { CreateCustomerDialog } from "@/src/features/customers/create-customer-dialog";
import { ACTION } from "@/src/lib/action-permissions";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { downloadCsv } from "@/src/lib/download";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { ListSearchInput } from "@/src/components/common/list-search-input";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  useGetBranchesQuery,
  useGetCustomerAnalyticsQuery,
  useGetCustomersQuery,
} from "@/src/store/api/admin-api";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useAppSelector } from "@/src/store/hooks";
import { ImportCustomersDialog } from "@/src/features/customers/import-customers-dialog";

export function CustomersPage() {
  const router = useRouter();
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const [q, setQ] = useState(() => sanitizeListSearchQueryInput(globalSearch));
  useEffect(() => {
    setQ(sanitizeListSearchQueryInput(globalSearch));
  }, [globalSearch]);
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const [kyc, setKyc] = useState("ALL");
  const debouncedQ = useDebouncedValue(q, 350);
  const pager = useCursorPagination(8, `${debouncedQ}|${branchKey}|${kyc}`);
  const { data, isLoading, isError, error, refetch } = useGetCustomersQuery(
    {
      q: listSearchQueryForApi(debouncedQ),
      branchId,
      kycStatus: kyc === "ALL" ? undefined : kyc,
      ...pager.queryParams,
    },
    { skip: shouldSkipListSearchQuery(debouncedQ) },
  );
  const { data: branchesData } = useGetBranchesQuery({ limit: 100 });
  const analyticsQuery = useGetCustomerAnalyticsQuery({
    branchId,
    period: "THIS_MONTH",
  });
  const branches = branchesData?.items ?? [];
  const [importOpen, setImportOpen] = useState(false);
  const branchCodeToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) {
      const code = (b as { code?: string }).code;
      if (code) map.set(String(code).toUpperCase(), String(b.id));
    }
    return map;
  }, [branches]);
  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <QueryError error={error} onRetry={refetch} />;
  const rows = data.items;
  const page = data.page ?? emptyPageMeta();
  const analyticsSummary = analyticsQuery.data?.summary ?? [];
  const metric = (key: string) =>
    analyticsSummary.find((m) => m.key === key)?.value;
  const analyticsTotals = analyticsQuery.data?.totals as
    | { kyc?: { verified?: number } }
    | undefined;
  const kycVerified =
    typeof analyticsTotals?.kyc?.verified === "number"
      ? analyticsTotals.kyc.verified
      : typeof metric("KYC_VERIFIED") === "number"
        ? metric("KYC_VERIFIED")
        : data.items.filter((x) => x.kyc === "VERIFIED").length;
  const activeSchemesMetric =
    typeof metric("CUSTOMERS_WITH_ACTIVE_SCHEME") === "number"
      ? metric("CUSTOMERS_WITH_ACTIVE_SCHEME")
      : typeof metric("WITH_ACTIVE_SCHEME") === "number"
        ? metric("WITH_ACTIVE_SCHEME")
        : null;
  const totalCustomers =
    typeof metric("TOTAL_CUSTOMERS") === "number"
      ? metric("TOTAL_CUSTOMERS")
      : typeof metric("TOTAL") === "number"
        ? metric("TOTAL")
        : data.total;
  return (
    <>
      <PageHeader
        title="Customers"
        description={`${totalCustomers} customer records across all branches.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "swarnagrow-customers.csv",
                  ["Customer ID", "Name", "Phone", "Branch", "KYC", "Status"],
                  rows.map((r) => [
                    r.customerNo,
                    r.name,
                    r.phone,
                    r.branch,
                    r.kyc,
                    r.status,
                  ]),
                )
              }
            >
              <Download />
              Export
            </Button>
            <PermissionGate permission={ACTION.customerWrite}>
              <CreateCustomerDialog branches={branches} />
            </PermissionGate>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UsersRound}
          label="Total customers"
          value={totalCustomers}
          detail={
            analyticsQuery.isFetching
              ? "Updating tenant totals…"
              : branches.length
                ? `Across ${branches.length} branch${branches.length === 1 ? "" : "es"}`
                : "Tenant-wide from analytics"
          }
        />
        <StatCard
          icon={UserCheck}
          label="KYC verified"
          value={kycVerified ?? "—"}
          detail={
            typeof metric("KYC_PENDING") === "number"
              ? `${metric("KYC_PENDING")} pending`
              : "Verification coverage"
          }
          tone="green"
        />
        <StatCard
          icon={Gift}
          label="With active scheme"
          value={activeSchemesMetric ?? "—"}
          detail={
            activeSchemesMetric != null
              ? "Customers with live enrollments (branch scope)"
              : "Open Analytics tab for branch totals"
          }
          tone="gold"
        />
      </div>
      <PageTabs defaultValue="directory">
        <PageTabsBar sectionLabel="Customers">
          <PageTab value="directory">Directory</PageTab>
          <PageTab value="analytics">Analytics</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="analytics">
          <CustomersAnalyticsTab />
        </PageTabsPanel>
        <PageTabsPanel value="directory">
      <Surface>
        <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(280px,1fr)_220px]">
          <ListSearchInput
            value={q}
            onChange={setQ}
            placeholder="Name, phone, customer ID or enrollment no."
            inputClassName="h-11"
          />
          <Select value={kyc} onValueChange={setKyc}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All KYC statuses</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          onRowClick={(row) => router.push(`/customers/${row.id}`)}
          columns={[
            {
              key: "customer",
              header: "Customer",
              render: (r) => (
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#f6e8c7] text-xs font-bold text-[#7a1730]">
                    {r.initials}
                  </span>
                  <strong>{r.name}</strong>
                </div>
              ),
            },
            { key: "id", header: "Customer ID", render: (r) => r.customerNo },
            { key: "phone", header: "Phone", render: (r) => r.phone },
            { key: "branch", header: "Branch", render: (r) => r.branch },
            {
              key: "schemes",
              header: "Active schemes",
              render: (r) => r.activeSchemes,
            },
            {
              key: "next",
              header: "Next due",
              render: (r) => (
                <span>
                  {r.nextDue}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {money(r.nextDueAmount)}
                  </span>
                </span>
              ),
            },
            {
              key: "overdue",
              header: "Overdue",
              render: (r) => (
                <span
                  className={
                    r.overdueAmount ? "text-red-600" : "text-emerald-700"
                  }
                >
                  {money(r.overdueAmount)}
                </span>
              ),
            },
            {
              key: "kyc",
              header: "KYC",
              render: (r) => <StatusBadge status={r.kyc} />,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "action",
              header: "",
              render: () => (
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical />
                </Button>
              ),
            },
          ]}
        />
      </Surface>
        </PageTabsPanel>
      </PageTabs>
      <ImportCustomersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        branchCodeToId={branchCodeToId}
        requireBranch={branches.length > 0}
      />
    </>
  );
}
