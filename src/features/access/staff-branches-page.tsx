"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  IndianRupee,
  MonitorSmartphone,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { PermissionGate } from "@/src/components/common/permission-gate";
import {
  FieldLabel,
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
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  useCreateBranchMutation,
  useCreateStaffMutation,
  useGetAccessSummaryQuery,
  useGetBranchesQuery,
  useGetStaffQuery,
} from "@/src/store/api/admin-api";

type StaffRole = "BRANCH_STAFF" | "BRANCH_MANAGER" | "TENANT_ADMIN";

export function StaffBranchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchFilter = searchParams.get("branchId") ?? undefined;
  const [createStaff] = useCreateStaffMutation();
  const [createBranch] = useCreateBranchMutation();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const staffPager = useCursorPagination(8, debouncedQ);
  const branchPager = useCursorPagination(8, "branches");

  const staffArgs = useMemo(
    () => ({
      q: debouncedQ || undefined,
      branchId: branchFilter,
      ...staffPager.queryParams,
    }),
    [debouncedQ, branchFilter, staffPager.queryParams],
  );
  const staffQuery = useGetStaffQuery(staffArgs);
  const branchesQuery = useGetBranchesQuery(branchPager.queryParams);
  const accessSummaryQuery = useGetAccessSummaryQuery();

  const branchOptions = branchesQuery.data?.items ?? [];

  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    line1: "",
    city: "",
    pincode: "",
    contactNumber: "",
  });

  const [staffForm, setStaffForm] = useState({
    name: "",
    mobile: "",
    password: "",
    role: "BRANCH_STAFF" as StaffRole,
    branchId: "",
    scope: "BRANCH" as "BRANCH" | "TENANT",
    mustChangePassword: true,
  });

  useEffect(() => {
    if (branchFilter) {
      setStaffForm((prev) =>
        prev.branchId === branchFilter
          ? prev
          : { ...prev, branchId: branchFilter },
      );
      return;
    }
    const first = branchOptions[0];
    if (first && !staffForm.branchId) {
      setStaffForm((prev) => ({ ...prev, branchId: first.id }));
    }
  }, [branchOptions, branchFilter, staffForm.branchId]);

  const branchRequiredForStaff =
    staffForm.role === "BRANCH_STAFF" ||
    staffForm.role === "BRANCH_MANAGER" ||
    (staffForm.role === "TENANT_ADMIN" && staffForm.scope === "BRANCH");

  if (
    staffQuery.isLoading ||
    branchesQuery.isLoading ||
    accessSummaryQuery.isLoading
  ) {
    return <PageSkeleton />;
  }
  if (
    staffQuery.isError ||
    branchesQuery.isError ||
    accessSummaryQuery.isError ||
    !staffQuery.data ||
    !branchesQuery.data ||
    !accessSummaryQuery.data
  )
    return (
      <QueryError
        onRetry={() => {
          staffQuery.refetch();
          branchesQuery.refetch();
          accessSummaryQuery.refetch();
        }}
      />
    );

  const staffItems = staffQuery.data.items;
  const branchItems = branchesQuery.data.items;
  const s = accessSummaryQuery.data;
  const staffSeatsFree = Math.max(0, s.staffLimit - s.staffUsed);
  const staffPage = staffQuery.data.page ?? emptyPageMeta();
  const branchPage = branchesQuery.data.page ?? emptyPageMeta();
  const branchFilterLabel = branchFilter
    ? (branchOptions.find((b) => b.id === branchFilter)?.name ??
      branchOptions.find((b) => b.id === branchFilter)?.code ??
      branchFilter)
    : null;

  return (
    <>
      <PageHeader
        eyebrow={
          branchFilterLabel
            ? `Access administration · ${branchFilterLabel}`
            : "Access administration"
        }
        title="Staff and branches"
        description={
          branchFilterLabel
            ? `Staff roster for ${branchFilterLabel}. New staff default to this branch.`
            : "Create staff with mobile login and a temporary password. Email invites are not used."
        }
        actions={
          <>
            <PermissionGate permission="branch.write">
              <ActionDialog
                trigger={
                  <Button variant="outline">
                    <Building2 />
                    Add branch
                  </Button>
                }
                title="Add branch"
                description="Branch code is 2–6 uppercase characters and cannot be changed after creation."
                actionLabel="Create branch"
                submitDisabled={!branchForm.name || !branchForm.code}
                onSubmit={async () => {
                  await createBranch({
                    name: branchForm.name,
                    code: branchForm.code.toUpperCase(),
                    address: {
                      line1: branchForm.line1 || undefined,
                      city: branchForm.city || undefined,
                      pincode: branchForm.pincode || undefined,
                    },
                    contactNumber: branchForm.contactNumber || undefined,
                  }).unwrap();
                  toast.success(`${branchForm.name} created`);
                  setBranchForm({
                    name: "",
                    code: "",
                    line1: "",
                    city: "",
                    pincode: "",
                    contactNumber: "",
                  });
                }}
              >
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Branch name</FieldLabel>
                    <Input
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, name: e.target.value })
                      }
                      placeholder="Panampilly Nagar"
                    />
                  </div>
                  <div>
                    <FieldLabel>Branch code</FieldLabel>
                    <Input
                      value={branchForm.code}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="PMN"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <FieldLabel>Address line</FieldLabel>
                    <Input
                      value={branchForm.line1}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, line1: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <Input
                        value={branchForm.city}
                        onChange={(e) =>
                          setBranchForm({ ...branchForm, city: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Pincode</FieldLabel>
                      <Input
                        value={branchForm.pincode}
                        onChange={(e) =>
                          setBranchForm({
                            ...branchForm,
                            pincode: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Contact number</FieldLabel>
                    <Input
                      inputMode="tel"
                      value={branchForm.contactNumber}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          contactNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </ActionDialog>
            </PermissionGate>
            <PermissionGate permission="staff.write">
              <ActionDialog
                trigger={
                  <Button>
                    <Plus />
                    Create staff
                  </Button>
                }
                title="Create staff member"
                description="Created directly with mobile and a temporary password. They sign in on the staff app — no invite email."
                actionLabel="Create staff"
                submitDisabled={
                  !staffForm.name ||
                  !staffForm.mobile ||
                  !staffForm.password ||
                  (branchRequiredForStaff && !staffForm.branchId)
                }
                onSubmit={async () => {
                  await createStaff({
                    name: staffForm.name,
                    mobile: staffForm.mobile.replace(/\s/g, ""),
                    password: staffForm.password,
                    role: staffForm.role,
                    branchId: staffForm.branchId,
                    scope:
                      staffForm.role === "TENANT_ADMIN"
                        ? staffForm.scope
                        : "BRANCH",
                    mustChangePassword: staffForm.mustChangePassword,
                  }).unwrap();
                  toast.success(
                    staffForm.mustChangePassword
                      ? `${staffForm.name} created — must change password on first login`
                      : `${staffForm.name} created`,
                  );
                  setStaffForm({
                    name: "",
                    mobile: "",
                    password: "",
                    role: "BRANCH_STAFF",
                    branchId: branchOptions[0]?.id ?? "",
                    scope: "BRANCH",
                    mustChangePassword: true,
                  });
                }}
              >
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <Input
                      value={staffForm.name}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Mobile number</FieldLabel>
                    <Input
                      inputMode="tel"
                      value={staffForm.mobile}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, mobile: e.target.value })
                      }
                      placeholder="9846778899"
                    />
                  </div>
                  <div>
                    <FieldLabel>Temporary password</FieldLabel>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={staffForm.password}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, password: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Role</FieldLabel>
                    <Select
                      value={staffForm.role}
                      onValueChange={(v) =>
                        setStaffForm({
                          ...staffForm,
                          role: v as StaffRole,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRANCH_STAFF">
                          Branch staff
                        </SelectItem>
                        <SelectItem value="BRANCH_MANAGER">
                          Branch manager
                        </SelectItem>
                        <SelectItem value="TENANT_ADMIN">
                          Tenant admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {staffForm.role === "TENANT_ADMIN" && (
                    <div>
                      <FieldLabel>Admin scope</FieldLabel>
                      <Select
                        value={staffForm.scope}
                        onValueChange={(v) =>
                          setStaffForm({
                            ...staffForm,
                            scope: v as "BRANCH" | "TENANT",
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TENANT">
                            Whole tenant
                          </SelectItem>
                          <SelectItem value="BRANCH">
                            Single branch only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {branchRequiredForStaff && (
                    <div>
                      <FieldLabel>Branch</FieldLabel>
                      <Select
                        value={staffForm.branchId}
                        onValueChange={(v) =>
                          setStaffForm({ ...staffForm, branchId: v })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} · {b.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Required for branch staff, branch managers, and
                        branch-scoped tenant admins.
                      </p>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={staffForm.mustChangePassword}
                      onCheckedChange={(v) =>
                        setStaffForm({
                          ...staffForm,
                          mustChangePassword: v === true,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span>
                      Require password change on first login (
                      <code className="text-xs">mustChangePassword</code>)
                    </span>
                  </label>
                </div>
              </ActionDialog>
            </PermissionGate>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={UsersRound}
          label="Active staff"
          value={`${s.activeStaff} / ${s.staffLimit || "—"}`}
          detail={
            s.staffLimit
              ? `${staffSeatsFree} seat${staffSeatsFree === 1 ? "" : "s"} available`
              : "Tenant-wide active staff"
          }
        />
        <StatCard
          icon={Building2}
          label="Branches"
          value={`${s.branches} / ${s.branchLimit || "—"}`}
          detail={s.planName ? `${s.planName} plan` : "Active branches"}
          tone="cream"
        />
        <StatCard
          icon={ShieldCheck}
          label="Tenant admins"
          value={s.admins}
          detail="Owner & admin roles (mobile + password sign-in)"
          tone="wine"
        />
        <StatCard
          icon={MonitorSmartphone}
          label="Active sessions"
          value={s.sessions}
          detail="Across web and mobile"
          tone="gold"
        />
        <StatCard
          icon={IndianRupee}
          label="Suspended"
          value={s.suspended}
          detail="Access blocked"
          tone="red"
        />
      </div>
      <Surface className="overflow-visible">
        <div className="grid gap-3 border-b border-[#eaded9] p-4 lg:grid-cols-[minmax(260px,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Staff name, phone, email or branch…"
              className="h-11 pl-11"
            />
          </div>
        </div>
        <PageTabs defaultValue="staff" layout="embedded">
          <PageTabsBar sectionLabel="Directory views">
            <PageTab value="staff">Staff</PageTab>
            <PageTab value="branches">Branches</PageTab>
            <PageTab value="sessions">Sessions</PageTab>
            <PageTab value="permissions">Permission audit</PageTab>
          </PageTabsBar>
          <PageTabsPanel value="staff" flush>
            <PaginatedDataTable
              rows={staffQuery.data.items}
              page={staffPage}
              pageIndex={staffPager.pageIndex}
              onNext={() => staffPager.goNext(staffPage.nextCursor)}
              onPrevious={staffPager.goPrevious}
              canPrevious={staffPager.canPrevious}
              onRowClick={(r) =>
                router.push(`/staff-branches/staff/${r.id}`)
              }
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (r) => <strong>{r.name}</strong>,
                },
                { key: "role", header: "Role", render: (r) => r.role },
                {
                  key: "branch",
                  header: "Branch",
                  render: (r) => r.branch,
                },
                {
                  key: "today",
                  header: "Today",
                  render: (r) => money(r.today),
                },
                {
                  key: "sessions",
                  header: "Sessions",
                  render: (r) => `${r.sessions} active`,
                },
                {
                  key: "seen",
                  header: "Last seen",
                  render: (r) => r.lastSeen,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "action",
                  header: "",
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-semibold text-[#730321]"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/staff-branches/staff/${r.id}`}>View</Link>
                    </Button>
                  ),
                },
              ]}
            />
          </PageTabsPanel>
          <PageTabsPanel value="branches" flush>
            <PaginatedDataTable
              rows={branchesQuery.data.items}
              page={branchPage}
              pageIndex={branchPager.pageIndex}
              onNext={() => branchPager.goNext(branchPage.nextCursor)}
              onPrevious={branchPager.goPrevious}
              canPrevious={branchPager.canPrevious}
              onRowClick={(r) =>
                router.push(`/staff-branches/branches/${r.id}`)
              }
              columns={[
                {
                  key: "name",
                  header: "Branch",
                  render: (r) => <strong>{r.name}</strong>,
                },
                { key: "code", header: "Code", render: (r) => r.code },
                { key: "city", header: "City", render: (r) => r.city },
                { key: "staff", header: "Staff", render: (r) => r.staff },
                {
                  key: "customers",
                  header: "Customers",
                  render: (r) => r.customers,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "action",
                  header: "",
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/staff-branches/branches/${r.id}`}>
                        Manage
                      </Link>
                    </Button>
                  ),
                },
              ]}
            />
          </PageTabsPanel>
          {["sessions", "permissions"].map((tab) => (
            <PageTabsPanel key={tab} value={tab} flush>
              <div className="grid min-h-56 place-items-center p-8 text-center">
                <div>
                  <MonitorSmartphone className="mx-auto mb-3 size-9 text-[#9a6f2a]" />
                  <h3 className="font-bold">
                    {tab[0].toUpperCase() + tab.slice(1)} register
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This view is connected to the corresponding access and audit
                    endpoints.
                  </p>
                </div>
              </div>
            </PageTabsPanel>
          ))}
        </PageTabs>
      </Surface>
    </>
  );
}
