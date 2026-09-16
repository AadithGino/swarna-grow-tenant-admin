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
  Plus,
  Search,
  Upload,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  FieldLabel,
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { downloadCsv } from "@/src/lib/download";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useCreateCustomerMutation,
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
  const [q, setQ] = useState(globalSearch);
  useEffect(() => {
    setQ(globalSearch);
  }, [globalSearch]);
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const [kyc, setKyc] = useState("ALL");
  const debouncedQ = useDebouncedValue(q, 350);
  const pager = useCursorPagination(8, `${debouncedQ}|${branchKey}|${kyc}`);
  const { data, isLoading, isError, refetch } = useGetCustomersQuery({
    q: debouncedQ || undefined,
    branchId,
    kycStatus: kyc === "ALL" ? undefined : kyc,
    ...pager.queryParams,
  });
  const { data: branchesData } = useGetBranchesQuery({ limit: 100 });
  const analyticsQuery = useGetCustomerAnalyticsQuery(
    branchId ? { branchId } : undefined,
  );
  const branches = branchesData?.items ?? [];
  const [createCustomer] = useCreateCustomerMutation();
  const [importOpen, setImportOpen] = useState(false);
  const branchCodeToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) {
      const code = (b as { code?: string }).code;
      if (code) map.set(String(code).toUpperCase(), String(b.id));
    }
    return map;
  }, [branches]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    branchId: "",
    address: "",
  });
  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <QueryError onRetry={refetch} />;
  const rows = data.items;
  const page = data.page ?? emptyPageMeta();
  const analyticsSummary = analyticsQuery.data?.summary ?? [];
  const metric = (key: string) =>
    analyticsSummary.find((m) => m.key === key)?.value;
  const kycVerified =
    typeof metric("KYC_VERIFIED") === "number"
      ? metric("KYC_VERIFIED")
      : data.items.filter((x) => x.kyc === "VERIFIED").length;
  const activeSchemesMetric =
    typeof metric("WITH_ACTIVE_SCHEME") === "number"
      ? metric("WITH_ACTIVE_SCHEME")
      : null;
  const totalCustomers =
    typeof metric("TOTAL") === "number" ? metric("TOTAL") : data.total;
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
            <ActionDialog
              trigger={
                <Button>
                  <Plus />
                  Create customer
                </Button>
              }
              title="Create customer"
              description="Mobile uniqueness is checked by the API before creation."
              actionLabel="Create customer"
              onSubmit={async () => {
                if (!form.name || !form.phone)
                  throw new Error("Name and phone are required");
                const created = await createCustomer({
                  name: form.name,
                  phone: form.phone,
                  email: form.email,
                  branchId: form.branchId || undefined,
                  address: form.address,
                }).unwrap();
                toast.success(`${created.name} created`);
                setForm({
                  name: "",
                  phone: "",
                  email: "",
                  branchId: "",
                  address: "",
                });
              }}
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Mobile number</FieldLabel>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      inputMode="tel"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Primary branch</FieldLabel>
                    <Select
                      value={form.branchId || undefined}
                      onValueChange={(value) =>
                        setForm({ ...form, branchId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <Input
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>
              </div>
            </ActionDialog>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, phone, customer ID or enrollment no."
              className="h-11 pl-11"
            />
          </div>
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
      />
    </>
  );
}
