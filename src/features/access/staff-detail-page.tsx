"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  IndianRupee,
  KeyRound,
  MonitorSmartphone,
  Pencil,
  Power,
  PowerOff,
  ScrollText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
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
import {
  liveStaffDeactivateReasonError,
  liveStaffNameError,
  liveTemporaryPasswordError,
  validateStaffDeactivateReason,
  validateStaffName,
  validateTemporaryPassword,
} from "@/src/lib/access-form-validation";
import { handleFormApiError } from "@/src/lib/form-api-error";
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
import {
  formatLastLogin,
  formatRoleLabel,
  initialsFromName,
  MoneyPair,
} from "@/src/features/access/access-detail-parts";
import {
  CashHandoverAlert,
  OverviewFieldGrid,
  StaffAccessSidebar,
  StaffDetailHero,
  StaffPermissionsSurface,
} from "@/src/features/access/access-detail-visuals";
import { StaffPerformanceTab } from "@/src/features/access/staff-performance-tab";
import {
  useActivateStaffMutation,
  useDeactivateStaffMutation,
  useGetBranchesQuery,
  useGetStaffDetailQuery,
  usePatchStaffMutation,
  useResetStaffPasswordMutation,
  useTransferStaffBranchMutation,
} from "@/src/store/api/admin-api";

type StaffDetail = Record<string, unknown>;

function branchRef(d: StaffDetail) {
  const b = d.branch as {
    id?: string | null;
    name?: string;
    code?: string;
  } | null;
  if (!b || b.id == null) return null;
  return b;
}

function staffBranchSubtitle(d: StaffDetail) {
  const b = d.branch as {
    id?: string | null;
    name?: string;
    code?: string;
  } | null;
  if (!b || b.id == null) return "All branches";
  return b.code ? `${b.name} (${b.code})` : String(b.name ?? "Branch");
}

function staffAccessScope(d: StaffDetail, branch: ReturnType<typeof branchRef>) {
  const fromApi = String(d.scope ?? "").trim();
  if (fromApi === "TENANT" || fromApi === "BRANCH") return fromApi;
  const role = String(d.role ?? "");
  if (
    !branch &&
    (role === "TENANT_OWNER" || role === "TENANT_ADMIN")
  ) {
    return "TENANT";
  }
  return "BRANCH";
}

export function StaffDetailPage({ staffId }: { staffId: string }) {
  const query = useGetStaffDetailQuery(staffId);
  const branchesQuery = useGetBranchesQuery({ limit: 50 });
  const [patchStaff] = usePatchStaffMutation();
  const [activateStaff] = useActivateStaffMutation();
  const [deactivateStaff] = useDeactivateStaffMutation();
  const [resetPassword] = useResetStaffPasswordMutation();
  const [transferBranch] = useTransferStaffBranchMutation();

  const [editName, setEditName] = useState("");
  const [tempPassword, setTempPassword] = useState("Temp#9182");
  const [transferBranchId, setTransferBranchId] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [editNameTouched, setEditNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [deactivateTouched, setDeactivateTouched] = useState(false);

  const editNameError = useMemo(() => {
    if (!editNameTouched && !editName.trim()) return undefined;
    return liveStaffNameError(editName);
  }, [editName, editNameTouched]);

  const tempPasswordError = useMemo(() => {
    if (!passwordTouched && !tempPassword) return undefined;
    return liveTemporaryPasswordError(tempPassword);
  }, [tempPassword, passwordTouched]);

  const deactivateReasonError = useMemo(() => {
    if (!deactivateTouched && !deactivateReason) return undefined;
    return liveStaffDeactivateReasonError(deactivateReason);
  }, [deactivateReason, deactivateTouched]);

  if (query.isLoading) return <PageSkeleton cards={5} />;
  if (query.isError || !query.data) {
    return (
      <QueryError
        onRetry={query.refetch}
        title="Staff record is unavailable"
        error={query.error}
      />
    );
  }

  const d = query.data as StaffDetail;
  const perf = d.performance as Record<string, unknown> | undefined;
  const audit = d.audit as Record<string, unknown> | undefined;
  const stats = d.stats as Record<string, unknown> | undefined;
  const branch = branchRef(d);
  const accessScope = staffAccessScope(d, branch);
  const status = String(d.status ?? "ACTIVE");
  const isActive = status === "ACTIVE";
  const permissions = (d.permissions as string[]) ?? [];
  const branchOptions = branchesQuery.data?.items ?? [];
  const cashBlock = perf?.cashInHand as
    | { amountDisplay?: string; amountPaise?: number }
    | undefined;
  const cashPaise = cashBlock?.amountPaise ?? 0;
  const name = String(d.name);
  const roleLabel = formatRoleLabel(String(d.role ?? ""));
  const lastLogin = formatLastLogin(
    (d.lastLoginAt ?? d.lastSeenAt) as string | null,
  );

  return (
    <>
      <Link
        href="/staff-branches"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#730321]"
      >
        ← Back to staff & branches
      </Link>

      <PageHeader
        eyebrow="Staff record"
        title={name}
        description={`${String(d.mobile)} · ${roleLabel} · ${staffBranchSubtitle(d)}`}
        actions={
          <>
            <PermissionGate permission="staff.write">
              <ActionDialog
                trigger={
                  <Button variant="outline">
                    <Pencil />
                    Edit profile
                  </Button>
                }
                title="Update staff profile"
                description="Change display name for receipts and audit."
                actionLabel="Save changes"
                submitDisabled={validateStaffName(editName) !== undefined}
                suppressDefaultErrorToast
                onOpenChange={(open) => {
                  if (open) {
                    setEditName(name);
                    setEditNameTouched(false);
                  }
                }}
                onError={(err) => {
                  handleFormApiError(err, {
                    fallback: "Could not update profile",
                  });
                }}
                onSubmit={async () => {
                  setEditNameTouched(true);
                  const nameErr = validateStaffName(editName);
                  if (nameErr) {
                    toast.error(nameErr);
                    return false;
                  }
                  try {
                    await patchStaff({
                      staffId,
                      body: { name: editName.trim() },
                    }).unwrap();
                    toast.success("Profile updated");
                    await query.refetch();
                  } catch (err) {
                    handleFormApiError(err, {
                      fallback: "Could not update profile",
                    });
                    return false;
                  }
                }}
              >
                <div>
                  <FieldLabel>Full name</FieldLabel>
                  <Input
                    value={editName}
                    onChange={(e) => {
                      setEditNameTouched(true);
                      setEditName(e.target.value);
                    }}
                    className={cn(editNameError && "border-red-600")}
                    aria-invalid={Boolean(editNameError)}
                  />
                  <FormFieldError message={editNameError} />
                </div>
              </ActionDialog>
            </PermissionGate>
            <Button variant="outline" asChild>
              <Link href="/cash-control">Cash control</Link>
            </Button>
          </>
        }
      />

      {cashPaise > 0 && cashBlock?.amountDisplay ? (
        <CashHandoverAlert
          amountDisplay={cashBlock.amountDisplay}
          pendingHandovers={Number(stats?.pendingHandovers ?? 0)}
          staffName={name}
        />
      ) : null}

      {d.mustChangePassword ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950">
          This account must change password on next login.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={IndianRupee}
          label="Collection this month"
          value={<MoneyPair block={perf?.collectionThisMonth as { amountDisplay?: string }} />}
          detail="Recorded payments"
        />
        <StatCard
          icon={ShieldCheck}
          label="Enrolments"
          value={String(perf?.enrolmentsThisMonth ?? "—")}
          detail="New schemes this month"
          tone="cream"
        />
        <StatCard
          icon={IndianRupee}
          label="Cash in hand"
          value={<MoneyPair block={cashBlock} />}
          detail={
            Number(stats?.pendingHandovers ?? 0) > 0
              ? "Handover pending"
              : "Settled with branch"
          }
          tone="gold"
        />
        <StatCard
          icon={MonitorSmartphone}
          label="Active sessions"
          value={String(d.activeSessions ?? "—")}
          detail={lastLogin}
          tone="wine"
        />
        <StatCard
          icon={UserRound}
          label="Customers served"
          value={String(stats?.customersServedThisMonth ?? "—")}
          detail="This month"
          tone="green"
        />
      </div>

      <StaffDetailHero
        name={name}
        initials={initialsFromName(name)}
        role={String(d.role ?? "")}
        scope={accessScope}
        mobile={String(d.mobile)}
        branchName={branch?.name}
        branchCode={branch?.code}
        branchId={branch?.id}
        isActive={isActive}
        mustChangePassword={Boolean(d.mustChangePassword)}
        lastLoginLabel={lastLogin}
      />

      <Surface>
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-[#1a1014]">Staff administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Password, branch assignment and access status
            </p>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <PermissionGate permission="staff.write">
                <ActionDialog
                  trigger={
                    <Button
                      variant="secondary"
                      className="w-full shrink-0 bg-[#f3eef0] sm:w-auto"
                    >
                      <KeyRound />
                      Reset password
                    </Button>
                  }
                  title="Reset password"
                  description="A temporary password is shown once. Share it securely with the staff member."
                  actionLabel="Reset password"
                  submitDisabled={validateTemporaryPassword(tempPassword) !== undefined}
                  suppressDefaultErrorToast
                  onOpenChange={(open) => {
                    if (open) setPasswordTouched(false);
                  }}
                  onError={(err) => {
                    handleFormApiError(err, {
                      fallback: "Could not reset password",
                    });
                  }}
                  onSubmit={async () => {
                    setPasswordTouched(true);
                    const pwdErr = validateTemporaryPassword(tempPassword);
                    if (pwdErr) {
                      toast.error(pwdErr);
                      return false;
                    }
                    try {
                      const res = (await resetPassword({
                        staffId,
                        mode: "SET_TEMPORARY",
                        temporaryPassword: tempPassword,
                      }).unwrap()) as { temporaryPassword?: string };
                      toast.success(
                        `Temporary password: ${res.temporaryPassword ?? tempPassword}`,
                      );
                    } catch (err) {
                      handleFormApiError(err, {
                        fallback: "Could not reset password",
                      });
                      return false;
                    }
                  }}
                >
                  <div>
                    <FieldLabel>Temporary password</FieldLabel>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={tempPassword}
                      onChange={(e) => {
                        setPasswordTouched(true);
                        setTempPassword(e.target.value);
                      }}
                      className={cn(tempPasswordError && "border-red-600")}
                      aria-invalid={Boolean(tempPasswordError)}
                    />
                    <FormFieldError message={tempPasswordError} />
                  </div>
                </ActionDialog>
                {String(d.role) === "TENANT_ADMIN" ? (
                  <ActionDialog
                    trigger={
                      <Button variant="secondary" className="w-full sm:w-auto">
                        <Building2 />
                        Transfer branch
                      </Button>
                    }
                    title="Transfer branch assignment"
                    description="For tenant admins scoped to a single branch."
                    actionLabel="Transfer"
                    submitDisabled={!transferBranchId}
                    onSubmit={async () => {
                      await transferBranch({
                        staffId,
                        branchId: transferBranchId,
                      }).unwrap();
                      toast.success("Branch updated");
                    }}
                  >
                    <div>
                      <FieldLabel>Branch</FieldLabel>
                      <Select
                        value={transferBranchId}
                        onValueChange={setTransferBranchId}
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
                    </div>
                  </ActionDialog>
                ) : null}
              </PermissionGate>
            </div>
            <div className="hidden h-9 w-px shrink-0 bg-[#e8dde2] xl:block" aria-hidden />
            <PermissionGate permission="staff.write">
              {isActive ? (
                <ActionDialog
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <PowerOff />
                      Deactivate
                    </Button>
                  }
                  title="Deactivate staff"
                  description="Cash balance must be zero before access can be removed."
                  actionLabel="Deactivate"
                  submitDisabled={
                    validateStaffDeactivateReason(deactivateReason) !== undefined
                  }
                  suppressDefaultErrorToast
                  onOpenChange={(open) => {
                    if (!open) {
                      setDeactivateReason("");
                      setDeactivateTouched(false);
                    }
                  }}
                  onError={(err) => {
                    toastApiError(err, "Could not deactivate");
                  }}
                  onSubmit={async () => {
                    setDeactivateTouched(true);
                    const reasonErr =
                      validateStaffDeactivateReason(deactivateReason);
                    if (reasonErr) {
                      toast.error(reasonErr);
                      return false;
                    }
                    try {
                      await deactivateStaff({
                        staffId,
                        reason: deactivateReason.trim() || undefined,
                      }).unwrap();
                      toast.success("Staff deactivated");
                      await query.refetch();
                    } catch (e: unknown) {
                      toastApiError(e, "Could not deactivate");
                      return false;
                    }
                  }}
                >
                  <div>
                    <FieldLabel>Reason (optional)</FieldLabel>
                    <Input
                      value={deactivateReason}
                      onChange={(e) => {
                        setDeactivateTouched(true);
                        setDeactivateReason(e.target.value);
                      }}
                      placeholder="Resigned"
                      className={cn(
                        deactivateReasonError && "border-red-600",
                      )}
                      aria-invalid={Boolean(deactivateReasonError)}
                    />
                    <FormFieldError message={deactivateReasonError} />
                  </div>
                </ActionDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await activateStaff(staffId).unwrap();
                    toast.success("Staff activated");
                  }}
                >
                  <Power />
                  Reactivate
                </Button>
              )}
            </PermissionGate>
          </div>
        </div>
      </Surface>

      <PageTabs defaultValue="summary">
        <PageTabsBar sectionLabel="Staff views">
          <PageTab value="summary">Summary</PageTab>
          <PageTab value="performance">
            <IndianRupee />
            Performance
          </PageTab>
          <PageTab value="permissions">
            <ShieldCheck />
            Permissions
          </PageTab>
          <PageTab value="audit">
            <ScrollText />
            Activity & audit
          </PageTab>
        </PageTabsBar>
        <PageTabsPanel value="summary">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Surface
              className="min-w-0"
              title="Staff overview"
              description="Identity, access scope and branch"
            >
              <OverviewFieldGrid
                rows={[
                  [
                    "Staff ID",
                    <span
                      key="staff-id"
                      className="block break-all font-mono text-xs leading-relaxed"
                      title={String(d.id)}
                    >
                      {String(d.id)}
                    </span>,
                  ],
                  ["Full name", name],
                  ["Mobile (login)", String(d.mobile)],
                  ["Role", roleLabel],
                  ["Scope", accessScope === "TENANT" ? "Tenant-wide" : "Branch"],
                  [
                    "Status",
                    <StatusBadge
                      key="st"
                      status={isActive ? "ACTIVE" : "SUSPENDED"}
                    />,
                  ],
                  [
                    "Password on first login",
                    d.mustChangePassword ? "Must change" : "Not required",
                  ],
                  ["Last login", lastLogin],
                  ["Active sessions", String(d.activeSessions ?? "—")],
                  [
                    "Branch",
                    branch ? (
                      <Link
                        href={`/staff-branches/branches/${branch.id}`}
                        className="text-[#730321] hover:underline"
                      >
                        {branch.name} · {branch.code}
                      </Link>
                    ) : (
                      "All branches (tenant scope)"
                    ),
                  ],
                  [
                    "Pending handovers",
                    String(stats?.pendingHandovers ?? "0"),
                  ],
                  [
                    "Customers served (month)",
                    String(stats?.customersServedThisMonth ?? "—"),
                  ],
                ]}
              />
            </Surface>
            <StaffAccessSidebar
              permissions={permissions}
              activeSessions={Number(d.activeSessions ?? 0)}
              pendingHandovers={Number(stats?.pendingHandovers ?? 0)}
            />
          </div>
        </PageTabsPanel>
        <PageTabsPanel value="performance">
          <StaffPerformanceTab staffId={staffId} />
        </PageTabsPanel>
        <PageTabsPanel value="permissions">
          <StaffPermissionsSurface
            permissions={permissions}
            role={String(d.role ?? "")}
          />
        </PageTabsPanel>
        <PageTabsPanel value="audit">
          <Surface
            title="Record history"
            description="When this staff account was created and last updated"
          >
            <OverviewFieldGrid
              rows={[
                [
                  "Created",
                  audit?.createdAt ? String(audit.createdAt) : "—",
                ],
                ["Record version", String(audit?.version ?? "—")],
                [
                  "Created by",
                  audit?.createdBy ? String(audit.createdBy) : "—",
                ],
              ]}
            />
          </Surface>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
