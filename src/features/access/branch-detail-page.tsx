"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
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
import { toastApiError } from "@/src/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  branchPatchFormReady,
  liveBranchFieldErrors,
  sanitizeBranchPincodeInput,
  sanitizeOptionalContactDigits,
  validateBranchPatchForm,
} from "@/src/lib/access-form-validation";
import { handleFormApiError } from "@/src/lib/form-api-error";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const patchForm = useMemo(
    () => ({ name, line1, city, pincode, contactNumber }),
    [name, line1, city, pincode, contactNumber],
  );
  const liveErrors = useMemo(
    () => liveBranchFieldErrors({ ...patchForm, code: "XX" }, { requireCode: false }),
    [patchForm],
  );
  const displayError = (field: keyof typeof patchForm) => {
    const show =
      touched[field] ||
      (field === "name" && name.trim()) ||
      (field === "pincode" && pincode.replace(/\D/g, "")) ||
      (field === "contactNumber" && contactNumber.replace(/\D/g, ""));
    return fieldErrors[field] ?? (show ? liveErrors[field] : undefined);
  };

  if (query.isLoading) return <PageSkeleton cards={5} />;
  if (query.isError || !query.data) {
    return (
      <QueryError
        onRetry={query.refetch}
        title="Branch record is unavailable"
        error={query.error}
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
              submitDisabled={!branchPatchFormReady(patchForm)}
              suppressDefaultErrorToast
              onOpenChange={(open) => {
                if (open) {
                  setName(branchName);
                  setLine1(line1Label === "—" ? "" : line1Label);
                  setCity(cityLabel === "—" ? "" : cityLabel);
                  setPincode(pincodeLabel === "—" ? "" : pincodeLabel);
                  setContactNumber(contact === "—" ? "" : contact);
                  setFieldErrors({});
                  setTouched({});
                }
              }}
              onError={(err) => {
                handleFormApiError(err, {
                  setFieldErrors,
                  fallback: "Could not update branch",
                });
              }}
              onSubmit={async () => {
                setTouched({
                  name: true,
                  line1: true,
                  city: true,
                  pincode: true,
                  contactNumber: true,
                });
                const clientErrors = validateBranchPatchForm(patchForm);
                if (Object.keys(clientErrors).length) {
                  setFieldErrors(clientErrors);
                  toast.error("Fix the highlighted fields.");
                  return false;
                }
                const pin = sanitizeBranchPincodeInput(pincode);
                try {
                  await patchBranch({
                    branchId,
                    body: {
                      name: name.trim(),
                      address: {
                        line1: line1.trim() || undefined,
                        city: city.trim() || undefined,
                        pincode: pin || undefined,
                      },
                      contactNumber:
                        sanitizeOptionalContactDigits(contactNumber) ||
                        undefined,
                      expectedVersion: audit?.version,
                    },
                  }).unwrap();
                  toast.success("Branch updated");
                  await query.refetch();
                } catch (err) {
                  handleFormApiError(err, {
                    setFieldErrors,
                    fallback: "Could not update branch",
                  });
                  return false;
                }
              }}
            >
              <div className="grid gap-4">
                <div>
                  <FieldLabel>Branch name</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, name: true }));
                      setFieldErrors((p) => {
                        const next = { ...p };
                        delete next.name;
                        return next;
                      });
                      setName(e.target.value);
                    }}
                    className={cn(displayError("name") && "border-red-600")}
                    aria-invalid={Boolean(displayError("name"))}
                  />
                  <FormFieldError message={displayError("name")} />
                </div>
                <div>
                  <FieldLabel>Address line</FieldLabel>
                  <Input
                    value={line1}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, line1: true }));
                      setFieldErrors((p) => {
                        const next = { ...p };
                        delete next.line1;
                        return next;
                      });
                      setLine1(e.target.value);
                    }}
                    className={cn(displayError("line1") && "border-red-600")}
                    aria-invalid={Boolean(displayError("line1"))}
                  />
                  <FormFieldError message={displayError("line1")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Input
                      value={city}
                      onChange={(e) => {
                        setTouched((p) => ({ ...p, city: true }));
                        setFieldErrors((p) => {
                          const next = { ...p };
                          delete next.city;
                          return next;
                        });
                        setCity(e.target.value);
                      }}
                      className={cn(displayError("city") && "border-red-600")}
                      aria-invalid={Boolean(displayError("city"))}
                    />
                    <FormFieldError message={displayError("city")} />
                  </div>
                  <div>
                    <FieldLabel>Pincode</FieldLabel>
                    <Input
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) => {
                        setTouched((p) => ({ ...p, pincode: true }));
                        setFieldErrors((p) => {
                          const next = { ...p };
                          delete next.pincode;
                          return next;
                        });
                        setPincode(sanitizeBranchPincodeInput(e.target.value));
                      }}
                      className={cn(displayError("pincode") && "border-red-600")}
                      aria-invalid={Boolean(displayError("pincode"))}
                    />
                    <FormFieldError message={displayError("pincode")} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Contact number</FieldLabel>
                  <Input
                    inputMode="tel"
                    value={contactNumber}
                    onChange={(e) => {
                      setTouched((p) => ({ ...p, contactNumber: true }));
                      setFieldErrors((p) => {
                        const next = { ...p };
                        delete next.contactNumber;
                        return next;
                      });
                      setContactNumber(
                        sanitizeOptionalContactDigits(e.target.value),
                      );
                    }}
                    className={cn(
                      displayError("contactNumber") && "border-red-600",
                    )}
                    aria-invalid={Boolean(displayError("contactNumber"))}
                  />
                  <FormFieldError message={displayError("contactNumber")} />
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
        activeSchemes={activeSchemes}
        collectionThisMonth={
          stats?.collectionThisMonth as { amountDisplay?: string }
        }
        pendingCashInHand={
          stats?.pendingCashInHand as { amountDisplay?: string }
        }
      />

      <Surface className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#eaded9] bg-[#faf7f5]/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#1a1014]">Branch administration</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Staff roster, cash control and deactivation
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
                      toastApiError(err, "Could not deactivate");
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
                  [
                    "Branch ID",
                    <span key="branch-id" className="font-mono text-sm">
                      {String(d.id)}
                    </span>,
                  ],
                  ["Name", branchName],
                  [
                    "Code",
                    <span key="branch-code" className="font-mono">{code}</span>,
                  ],
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
