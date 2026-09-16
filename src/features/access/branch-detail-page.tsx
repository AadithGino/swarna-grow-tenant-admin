"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  IndianRupee,
  MapPin,
  Pencil,
  Power,
  PowerOff,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
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
import { MoneyPair } from "@/src/features/access/access-detail-parts";
import { BranchPerformanceTab } from "@/src/features/access/branch-performance-tab";
import { BranchStaffTab } from "@/src/features/access/branch-staff-tab";
import {
  BranchDeactivationAlert,
  BranchDetailHero,
  BranchStatsSidebar,
  OverviewFieldGrid,
} from "@/src/features/access/access-detail-visuals";
import {
  useActivateBranchMutation,
  useDeactivateBranchMutation,
  useGetBranchDetailQuery,
  usePatchBranchMutation,
} from "@/src/store/api/admin-api";

type BranchDetail = Record<string, unknown>;

export function BranchDetailPage({ branchId }: { branchId: string }) {
  const query = useGetBranchDetailQuery(branchId);
  const [patchBranch] = usePatchBranchMutation();
  const [activateBranch] = useActivateBranchMutation();
  const [deactivateBranch] = useDeactivateBranchMutation();

  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  if (query.isLoading) return <PageSkeleton cards={5} />;
  if (query.isError || !query.data) {
    return (
      <QueryError
        onRetry={query.refetch}
        title="Branch record is unavailable"
      />
    );
  }

  const d = query.data as BranchDetail;
  const address = d.address as Record<string, string> | undefined;
  const stats = d.stats as Record<string, unknown> | undefined;
  const audit = d.audit as Record<string, unknown> | undefined;
  const guards = d.guards as Record<string, unknown> | undefined;
  const status = String(d.status ?? "ACTIVE");
  const isActive = status === "ACTIVE";
  const canDeactivate = guards?.canDeactivate === true;
  const guardBlock =
    guards?.canDeactivate !== true && guards?.canDeactivate != null
      ? (guards.canDeactivate as Record<string, unknown>)
      : null;

  const branchName = String(d.name);
  const code = String(d.code);
  const cityLabel = address?.city?.trim() || "—";
  const line1Label = address?.line1?.trim() || "—";
  const pincodeLabel = address?.pincode?.trim() || "—";
  const contactRaw = d.contactNumber ?? d.mobile;
  const contact =
    contactRaw != null && String(contactRaw).trim()
      ? String(contactRaw).trim()
      : "—";
  const headerContact = contact !== "—" ? contact : "No contact on file";
  const headerCity = cityLabel !== "—" ? cityLabel : "City not set";
  const activeSchemes = Number(stats?.activeSchemes ?? 0);
  const staffCount = Number(stats?.staffCount ?? 0);
  const activeCustomers = Number(stats?.activeCustomers ?? 0);

  return (
    <>
      <Link
        href="/staff-branches"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#730321]"
      >
        ← Back to staff & branches
      </Link>

      <PageHeader
        eyebrow="Branch record"
        title={branchName}
        description={`${code} · ${headerCity} · ${headerContact}`}
        actions={
          <PermissionGate permission="branch.write">
            <ActionDialog
              trigger={
                <Button variant="outline">
                  <Pencil />
                  Edit branch
                </Button>
              }
              title="Update branch"
              description="Branch code cannot be changed after creation."
              actionLabel="Save changes"
              onOpenChange={(open) => {
                if (open) {
                  setName(branchName);
                  setLine1(line1Label === "—" ? "" : line1Label);
                  setCity(cityLabel === "—" ? "" : cityLabel);
                  setPincode(pincodeLabel === "—" ? "" : pincodeLabel);
                  setContactNumber(contact === "—" ? "" : contact);
                }
              }}
              onSubmit={async () => {
                try {
                  await patchBranch({
                    branchId,
                    body: {
                      name: name.trim() || undefined,
                      address: {
                        line1: line1.trim() || undefined,
                        city: city.trim() || undefined,
                        pincode: pincode.trim() || undefined,
                      },
                      contactNumber: contactNumber.trim() || undefined,
                      expectedVersion: audit?.version,
                    },
                  }).unwrap();
                  toast.success("Branch updated");
                  await query.refetch();
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Could not update branch. Try again.",
                  );
                  return false;
                }
              }}
            >
              <div className="grid gap-4">
                <div>
                  <FieldLabel>Branch name</FieldLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Address line</FieldLabel>
                  <Input value={line1} onChange={(e) => setLine1(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Pincode</FieldLabel>
                    <Input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Contact number</FieldLabel>
                  <Input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
              </div>
            </ActionDialog>
          </PermissionGate>
        }
      />

      {guardBlock && isActive ? (
        <BranchDeactivationAlert
          activeSchemes={Number(guardBlock.activeSchemes ?? activeSchemes)}
          activeStaff={Number(guardBlock.activeStaff ?? staffCount)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={UsersRound}
          label="Active customers"
          value={activeCustomers.toLocaleString("en-IN")}
          detail="Enrolled at this branch"
        />
        <StatCard
          icon={Building2}
          label="Active schemes"
          value={activeSchemes.toLocaleString("en-IN")}
          detail="Open enrollments"
          tone="cream"
        />
        <StatCard
          icon={UsersRound}
          label="Staff"
          value={staffCount}
          detail="Assigned to branch"
          tone="wine"
        />
        <StatCard
          icon={IndianRupee}
          label="Collection this month"
          value={
            <MoneyPair
              block={
                stats?.collectionThisMonth as { amountDisplay?: string }
              }
            />
          }
          detail="Branch total"
          tone="gold"
        />
        <StatCard
          icon={IndianRupee}
          label="Cash with staff"
          value={
            <MoneyPair
              block={stats?.pendingCashInHand as { amountDisplay?: string }}
            />
          }
          detail="Awaiting handover"
          tone="red"
        />
      </div>

      <BranchDetailHero
        name={branchName}
        code={code}
        city={cityLabel}
        line1={line1Label}
        pincode={pincodeLabel}
        contactNumber={contact}
        isActive={isActive}
        staffCount={staffCount}
        activeCustomers={activeCustomers}
      />

      <Surface>
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-[#1a1014]">Branch administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Showroom profile, staff roster and deactivation rules
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="bg-[#f3eef0]" asChild>
              <Link href={`/staff-branches?branchId=${encodeURIComponent(branchId)}`}>
                View all staff
              </Link>
            </Button>
            <Button variant="secondary" className="bg-[#f3eef0]" asChild>
              <Link
                href={`/cash-control?branchId=${encodeURIComponent(branchId)}`}
              >
                Cash control
              </Link>
            </Button>
            <PermissionGate permission="branch.write">
              {isActive ? (
                <ActionDialog
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={!!guardBlock}
                    >
                      <PowerOff />
                      Deactivate branch
                    </Button>
                  }
                  title="Deactivate branch"
                  description="All active schemes must be closed or transferred first."
                  actionLabel="Deactivate"
                  submitDisabled={!!guardBlock}
                  onSubmit={async () => {
                    try {
                      await deactivateBranch(branchId).unwrap();
                      toast.success("Branch deactivated");
                    } catch (e: unknown) {
                      const err = e as { data?: { message?: string } };
                      toast.error(err?.data?.message ?? "Could not deactivate");
                      throw e;
                    }
                  }}
                >
                  {guardBlock ? (
                    <p className="text-sm text-muted-foreground">
                      {activeSchemes.toLocaleString("en-IN")} schemes still
                      active at this branch.
                    </p>
                  ) : null}
                </ActionDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await activateBranch(branchId).unwrap();
                    toast.success("Branch activated");
                  }}
                >
                  <Power />
                  Reactivate branch
                </Button>
              )}
            </PermissionGate>
          </div>
        </div>
      </Surface>

      <PageTabs defaultValue="summary">
        <PageTabsBar sectionLabel="Branch views">
          <PageTab value="summary">Summary</PageTab>
          <PageTab value="staff">
            <UsersRound />
            Staff
          </PageTab>
          <PageTab value="operations">
            <MapPin />
            Location & contact
          </PageTab>
          <PageTab value="stats">
            <IndianRupee />
            Performance
          </PageTab>
          <PageTab value="audit">
            <ScrollText />
            Activity & audit
          </PageTab>
        </PageTabsBar>
        <PageTabsPanel value="summary">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <Surface
              title="Branch overview"
              description="Identity and operational status"
            >
              <OverviewFieldGrid
                rows={[
                  ["Branch ID", <span className="font-mono text-sm">{String(d.id)}</span>],
                  ["Name", branchName],
                  ["Code", <span className="font-mono">{code}</span>],
                  [
                    "Status",
                    <StatusBadge
                      key="st"
                      status={isActive ? "ACTIVE" : "INACTIVE"}
                    />,
                  ],
                  ["City", cityLabel],
                  ["Active customers", activeCustomers.toLocaleString("en-IN")],
                  ["Active schemes", activeSchemes.toLocaleString("en-IN")],
                  ["Staff count", String(staffCount)],
                  [
                    "Collection (month)",
                    <MoneyPair
                      key="col"
                      block={
                        stats?.collectionThisMonth as {
                          amountDisplay?: string;
                        }
                      }
                    />,
                  ],
                  [
                    "Cash with staff",
                    <MoneyPair
                      key="cash"
                      block={
                        stats?.pendingCashInHand as {
                          amountDisplay?: string;
                        }
                      }
                    />,
                  ],
                ]}
              />
            </Surface>
            <BranchStatsSidebar
              collection={
                stats?.collectionThisMonth as { amountDisplay?: string }
              }
              pendingCash={
                stats?.pendingCashInHand as { amountDisplay?: string }
              }
              activeSchemes={activeSchemes}
              canDeactivate={canDeactivate}
            />
          </div>
        </PageTabsPanel>
        <PageTabsPanel value="staff">
          <BranchStaffTab branchId={branchId} />
        </PageTabsPanel>
        <PageTabsPanel value="operations">
          <Surface
            title="Showroom address"
            description="Printed on receipts and customer communications"
          >
            <OverviewFieldGrid
              rows={[
                ["Address line", line1Label],
                ["City", cityLabel],
                ["Pincode", pincodeLabel],
                ["Contact number", contact],
                [
                  "Deactivation",
                  canDeactivate
                    ? "Allowed — no blocking active schemes"
                    : `${activeSchemes.toLocaleString("en-IN")} active schemes must be cleared first`,
                ],
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="stats">
          <BranchPerformanceTab branchId={branchId} />
        </PageTabsPanel>
        <PageTabsPanel value="audit">
          <Surface
            title="Record history"
            description="Branch creation and version"
          >
            <OverviewFieldGrid
              rows={[
                [
                  "Created",
                  audit?.createdAt ? String(audit.createdAt) : "—",
                ],
                ["Record version", String(audit?.version ?? "—")],
                [
                  "Deactivation guard",
                  canDeactivate ? (
                    <span className="text-emerald-700">Clear</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="size-4" />
                      Active schemes present
                    </span>
                  ),
                ],
              ]}
            />
          </Surface>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
