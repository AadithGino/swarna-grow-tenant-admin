"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  IndianRupee,
  MonitorSmartphone,
  Plus,
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
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  branchCreateFormReady,
  createStaffFormReady,
  liveBranchFieldErrors,
  liveCreateStaffFieldErrors,
  sanitizeBranchCodeInput,
  sanitizeBranchPincodeInput,
  sanitizeOptionalContactDigits,
  staffRequiresBranch,
  validateBranchCreateForm,
  validateCreateStaffForm,
  type BranchFormFields,
  type CreateStaffFormFields,
} from "@/src/lib/access-form-validation";
import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { handleFormApiError } from "@/src/lib/form-api-error";
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
import { ListSearchInput } from "@/src/components/common/list-search-input";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  useCreateBranchMutation,
  useCreateStaffMutation,
  useGetAccessSummaryQuery,
  useGetBranchesQuery,
  useGetStaffQuery,
} from "@/src/store/api/admin-api";

type StaffRole = "BRANCH_STAFF" | "BRANCH_MANAGER" | "TENANT_ADMIN";

const emptyBranchForm = (): BranchFormFields => ({
  name: "",
  code: "",
  line1: "",
  city: "",
  pincode: "",
  contactNumber: "",
});

const emptyStaffForm = (branchId = ""): CreateStaffFormFields => ({
  name: "",
  mobile: "",
  password: "",
  role: "BRANCH_STAFF",
  branchId,
  scope: "BRANCH",
});

function mergeFieldMessage(
  apiOrSubmit: string | undefined,
  live: string | undefined,
): string | undefined {
  return apiOrSubmit ?? live;
}

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
      q: listSearchQueryForApi(debouncedQ),
      branchId: branchFilter,
      ...staffPager.queryParams,
    }),
    [debouncedQ, branchFilter, staffPager.queryParams],
  );
  const staffQuery = useGetStaffQuery(staffArgs, {
    skip: shouldSkipListSearchQuery(debouncedQ),
  });
  const branchesQuery = useGetBranchesQuery(branchPager.queryParams);
  const accessSummaryQuery = useGetAccessSummaryQuery();

  const branchOptions = branchesQuery.data?.items ?? [];

  const [branchForm, setBranchForm] = useState<BranchFormFields>(
    emptyBranchForm(),
  );
  const [branchFieldErrors, setBranchFieldErrors] = useState<
    Record<string, string>
  >({});
  const [branchTouched, setBranchTouched] = useState<
    Partial<Record<keyof BranchFormFields, boolean>>
  >({});

  const [staffForm, setStaffForm] = useState<
    CreateStaffFormFields & { mustChangePassword: boolean }
  >({ ...emptyStaffForm(), mustChangePassword: true });
  const [staffFieldErrors, setStaffFieldErrors] = useState<
    Record<string, string>
  >({});
  const [staffBranchTouched, setStaffBranchTouched] = useState(false);
  const [staffTouched, setStaffTouched] = useState<
    Partial<Record<keyof CreateStaffFormFields, boolean>>
  >({});

  const branchLiveErrors = useMemo(
    () => liveBranchFieldErrors(branchForm),
    [branchForm],
  );
  const staffLiveErrors = useMemo(
    () =>
      liveCreateStaffFieldErrors(staffForm, {
        branchTouched: staffBranchTouched,
      }),
    [staffForm, staffBranchTouched],
  );

  const branchDisplayError = (field: keyof BranchFormFields) => {
    const showLive =
      branchTouched[field] ||
      (field === "name" && branchForm.name.trim()) ||
      (field === "code" && branchForm.code.trim());
    return mergeFieldMessage(
      branchFieldErrors[field],
      showLive ? branchLiveErrors[field] : undefined,
    );
  };

  const staffDisplayError = (field: keyof CreateStaffFormFields) => {
    const showLive =
      staffTouched[field] ||
      (field === "name" && staffForm.name.trim()) ||
      (field === "mobile" && staffForm.mobile.replace(/\D/g, "")) ||
      (field === "password" && staffForm.password);
    return mergeFieldMessage(
      staffFieldErrors[field],
      showLive ? staffLiveErrors[field] : undefined,
    );
  };

  const resetBranchDialog = () => {
    setBranchForm(emptyBranchForm());
    setBranchFieldErrors({});
    setBranchTouched({});
  };

  const resetStaffDialog = () => {
    setStaffForm({
      ...emptyStaffForm(branchOptions[0]?.id ?? ""),
      mustChangePassword: true,
    });
    setStaffFieldErrors({});
    setStaffTouched({});
    setStaffBranchTouched(false);
  };

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

  const branchRequiredForStaff = staffRequiresBranch(
    staffForm.role,
    staffForm.scope,
  );

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
        error={
          staffQuery.error ?? branchesQuery.error ?? accessSummaryQuery.error
        }
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
                submitDisabled={!branchCreateFormReady(branchForm)}
                suppressDefaultErrorToast
                onOpenChange={(open) => {
                  if (!open) resetBranchDialog();
                }}
                onError={(err) => {
                  handleFormApiError(err, {
                    setFieldErrors: setBranchFieldErrors,
                    fallback: "Could not create branch",
                  });
                }}
                onSubmit={async () => {
                  setBranchTouched({
                    name: true,
                    code: true,
                    line1: true,
                    city: true,
                    pincode: true,
                    contactNumber: true,
                  });
                  const clientErrors = validateBranchCreateForm(branchForm);
                  if (Object.keys(clientErrors).length) {
                    setBranchFieldErrors(clientErrors);
                    toast.error("Fix the highlighted fields.");
                    return false;
                  }
                  const pin = sanitizeBranchPincodeInput(branchForm.pincode);
                  await createBranch({
                    name: branchForm.name.trim(),
                    code: branchForm.code.trim().toUpperCase(),
                    address: {
                      line1: branchForm.line1.trim() || undefined,
                      city: branchForm.city.trim() || undefined,
                      pincode: pin || undefined,
                    },
                    contactNumber:
                      sanitizeOptionalContactDigits(
                        branchForm.contactNumber,
                      ) || undefined,
                  }).unwrap();
                  toast.success(`${branchForm.name.trim()} created`);
                  resetBranchDialog();
                }}
              >
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Branch name</FieldLabel>
                    <Input
                      value={branchForm.name}
                      onChange={(e) => {
                        setBranchTouched((p) => ({ ...p, name: true }));
                        setBranchFieldErrors((p) => {
                          const next = { ...p };
                          delete next.name;
                          return next;
                        });
                        setBranchForm({ ...branchForm, name: e.target.value });
                      }}
                      placeholder="Panampilly Nagar"
                      className={cn(
                        branchDisplayError("name") && "border-red-600",
                      )}
                      aria-invalid={Boolean(branchDisplayError("name"))}
                    />
                    <FormFieldError message={branchDisplayError("name")} />
                  </div>
                  <div>
                    <FieldLabel>Branch code</FieldLabel>
                    <Input
                      value={branchForm.code}
                      onChange={(e) => {
                        setBranchTouched((p) => ({ ...p, code: true }));
                        setBranchFieldErrors((p) => {
                          const next = { ...p };
                          delete next.code;
                          return next;
                        });
                        setBranchForm({
                          ...branchForm,
                          code: sanitizeBranchCodeInput(e.target.value),
                        });
                      }}
                      placeholder="PMN"
                      maxLength={6}
                      className={cn(
                        branchDisplayError("code") && "border-red-600",
                      )}
                      aria-invalid={Boolean(branchDisplayError("code"))}
                    />
                    <FormFieldError message={branchDisplayError("code")} />
                  </div>
                  <div>
                    <FieldLabel>Address line</FieldLabel>
                    <Input
                      value={branchForm.line1}
                      onChange={(e) => {
                        setBranchTouched((p) => ({ ...p, line1: true }));
                        setBranchFieldErrors((p) => {
                          const next = { ...p };
                          delete next.line1;
                          return next;
                        });
                        setBranchForm({ ...branchForm, line1: e.target.value });
                      }}
                      className={cn(
                        branchDisplayError("line1") && "border-red-600",
                      )}
                      aria-invalid={Boolean(branchDisplayError("line1"))}
                    />
                    <FormFieldError message={branchDisplayError("line1")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <Input
                        value={branchForm.city}
                        onChange={(e) => {
                          setBranchTouched((p) => ({ ...p, city: true }));
                          setBranchFieldErrors((p) => {
                            const next = { ...p };
                            delete next.city;
                            return next;
                          });
                          setBranchForm({ ...branchForm, city: e.target.value });
                        }}
                        className={cn(
                          branchDisplayError("city") && "border-red-600",
                        )}
                        aria-invalid={Boolean(branchDisplayError("city"))}
                      />
                      <FormFieldError message={branchDisplayError("city")} />
                    </div>
                    <div>
                      <FieldLabel>Pincode</FieldLabel>
                      <Input
                        inputMode="numeric"
                        value={branchForm.pincode}
                        onChange={(e) => {
                          setBranchTouched((p) => ({ ...p, pincode: true }));
                          setBranchFieldErrors((p) => {
                            const next = { ...p };
                            delete next.pincode;
                            return next;
                          });
                          setBranchForm({
                            ...branchForm,
                            pincode: sanitizeBranchPincodeInput(e.target.value),
                          });
                        }}
                        className={cn(
                          branchDisplayError("pincode") && "border-red-600",
                        )}
                        aria-invalid={Boolean(branchDisplayError("pincode"))}
                      />
                      <FormFieldError message={branchDisplayError("pincode")} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Contact number</FieldLabel>
                    <Input
                      inputMode="tel"
                      value={branchForm.contactNumber}
                      onChange={(e) => {
                        setBranchTouched((p) => ({ ...p, contactNumber: true }));
                        setBranchFieldErrors((p) => {
                          const next = { ...p };
                          delete next.contactNumber;
                          return next;
                        });
                        setBranchForm({
                          ...branchForm,
                          contactNumber: sanitizeOptionalContactDigits(
                            e.target.value,
                          ),
                        });
                      }}
                      className={cn(
                        branchDisplayError("contactNumber") &&
                          "border-red-600",
                      )}
                      aria-invalid={Boolean(
                        branchDisplayError("contactNumber"),
                      )}
                    />
                    <FormFieldError
                      message={branchDisplayError("contactNumber")}
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
                submitDisabled={!createStaffFormReady(staffForm)}
                suppressDefaultErrorToast
                onOpenChange={(open) => {
                  if (!open) resetStaffDialog();
                }}
                onError={(err) => {
                  handleFormApiError(err, {
                    setFieldErrors: setStaffFieldErrors,
                    fallback: "Could not create staff",
                  });
                }}
                onSubmit={async () => {
                  setStaffTouched({
                    name: true,
                    mobile: true,
                    password: true,
                    branchId: true,
                  });
                  setStaffBranchTouched(true);
                  const clientErrors = validateCreateStaffForm(staffForm);
                  if (Object.keys(clientErrors).length) {
                    setStaffFieldErrors(clientErrors);
                    toast.error("Fix the highlighted fields.");
                    return false;
                  }
                  const mobile = sanitizeIndianPhoneDigits(staffForm.mobile);
                  await createStaff({
                    name: staffForm.name.trim(),
                    mobile,
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
                      ? `${staffForm.name.trim()} created — must change password on first login`
                      : `${staffForm.name.trim()} created`,
                  );
                  resetStaffDialog();
                }}
              >
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <Input
                      value={staffForm.name}
                      onChange={(e) => {
                        setStaffTouched((p) => ({ ...p, name: true }));
                        setStaffFieldErrors((p) => {
                          const next = { ...p };
                          delete next.name;
                          return next;
                        });
                        setStaffForm({ ...staffForm, name: e.target.value });
                      }}
                      className={cn(
                        staffDisplayError("name") && "border-red-600",
                      )}
                      aria-invalid={Boolean(staffDisplayError("name"))}
                    />
                    <FormFieldError message={staffDisplayError("name")} />
                  </div>
                  <div>
                    <FieldLabel>Mobile number</FieldLabel>
                    <Input
                      inputMode="tel"
                      value={staffForm.mobile}
                      onChange={(e) => {
                        setStaffTouched((p) => ({ ...p, mobile: true }));
                        setStaffFieldErrors((p) => {
                          const next = { ...p };
                          delete next.mobile;
                          return next;
                        });
                        setStaffForm({
                          ...staffForm,
                          mobile: sanitizeIndianPhoneDigits(e.target.value),
                        });
                      }}
                      placeholder="9846778899"
                      className={cn(
                        staffDisplayError("mobile") && "border-red-600",
                      )}
                      aria-invalid={Boolean(staffDisplayError("mobile"))}
                    />
                    <FormFieldError message={staffDisplayError("mobile")} />
                  </div>
                  <div>
                    <FieldLabel>Temporary password</FieldLabel>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={staffForm.password}
                      onChange={(e) => {
                        setStaffTouched((p) => ({ ...p, password: true }));
                        setStaffFieldErrors((p) => {
                          const next = { ...p };
                          delete next.password;
                          return next;
                        });
                        setStaffForm({ ...staffForm, password: e.target.value });
                      }}
                      className={cn(
                        staffDisplayError("password") && "border-red-600",
                      )}
                      aria-invalid={Boolean(staffDisplayError("password"))}
                    />
                    <FormFieldError message={staffDisplayError("password")} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      At least 8 characters (same rule as staff login).
                    </p>
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
                        onValueChange={(v) => {
                          setStaffBranchTouched(true);
                          setStaffFieldErrors((p) => {
                            const next = { ...p };
                            delete next.branchId;
                            return next;
                          });
                          setStaffForm({ ...staffForm, branchId: v });
                        }}
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
                      <FormFieldError
                        message={staffDisplayError("branchId")}
                      />
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
          <ListSearchInput
            value={q}
            onChange={setQ}
            placeholder="Staff name, phone, email or branch…"
            inputClassName="h-11"
          />
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
