"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  availabilitySliceFromPlan,
  buildPlanAvailabilityPatchPayload,
  type PlanAvailabilityFormSlice,
} from "@/src/features/schemes/plan-builder-form";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  useActivatePlanMutation,
  useGetBranchesQuery,
  usePatchPlanMutation,
} from "@/src/store/api/admin-api";

function ToggleRow({
  label,
  detail,
  checked,
  onCheckedChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#eaded9] p-4">
      <div>
        <strong className="text-sm">{label}</strong>
        {detail ? (
          <p className="text-sm text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function PlanAvailabilityDialog({
  plan,
  planId,
  open,
  onOpenChange,
}: {
  plan: Record<string, unknown>;
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [patchPlan, patchState] = usePatchPlanMutation();
  const [activatePlan, activateState] = useActivatePlanMutation();
  const branchesQuery = useGetBranchesQuery({ limit: 100 }, { skip: !open });
  const branches = branchesQuery.data?.items ?? [];
  const planStatus = String(plan.status ?? "DRAFT");
  const publishBlocked = planStatus !== "ACTIVE";

  const [form, setForm] = useState<PlanAvailabilityFormSlice>(() =>
    availabilitySliceFromPlan(plan),
  );

  const set = (patch: Partial<PlanAvailabilityFormSlice>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const displayName = String(plan.displayName ?? plan.name ?? "Plan");
  const todayYmd = new Date().toISOString().slice(0, 10);
  const enrolFrom = form.enrolmentOpenFrom || null;
  const enrolTo = form.enrolmentOpenTo || null;
  const outsideEnrolWindow =
    (enrolFrom && todayYmd < enrolFrom) || (enrolTo && todayYmd > enrolTo);

  async function onActivate() {
    try {
      await activatePlan(planId).unwrap();
      toast.success(`${displayName} is now active — customers can see it when app toggles are on`);
    } catch (err) {
      toastApiError(err, "Could not activate plan");
    }
  }

  async function onSave() {
    try {
      await patchPlan({
        planId,
        body: buildPlanAvailabilityPatchPayload(form),
      }).unwrap();
      toast.success("Availability updated");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not update availability");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(availabilitySliceFromPlan(plan));
        onOpenChange(next);
      }}
    >
      <DialogContent className={dialogScrollShellClass}>
        <DialogHeader>
          <DialogTitle>Customer app & availability</DialogTitle>
          <DialogDescription>
            Control where <span className="font-semibold">{displayName}</span>{" "}
            appears and who can enrol — without changing financial rules.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {publishBlocked ? (
            <div className="rounded-xl border border-amber-200 bg-[#fff8e8] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={planStatus} />
                <span className="font-semibold text-[#805817]">
                  Not published to customers
                </span>
              </div>
              <p className="mt-2 text-[#5c4a2a]">
                Explore plans only lists <b>Active</b> templates. Turn on the toggles
                below, then activate this plan.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={activateState.isLoading}
                onClick={() => void onActivate()}
              >
                {activateState.isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Activating…
                  </>
                ) : (
                  "Activate plan"
                )}
              </Button>
            </div>
          ) : null}
          {outsideEnrolWindow ? (
            <div className="rounded-xl border border-amber-200 bg-[#fff8e8] px-4 py-3 text-sm text-[#5c4a2a]">
              Today ({todayYmd}) is outside the enrolment window
              {enrolFrom || enrolTo
                ? ` (${enrolFrom ?? "open"} → ${enrolTo ?? "no end"})`
                : ""}
              . Customers will not see this plan until the window includes today.
            </div>
          ) : null}
          <ToggleRow
            label="All branches"
            detail="When off, only selected branches can enrol on this plan."
            checked={form.allBranches}
            onCheckedChange={(allBranches) =>
              set({ allBranches, branchIds: allBranches ? [] : form.branchIds })
            }
          />
          {!form.allBranches ? (
            <div className="rounded-xl border border-[#eaded9] p-4">
              <FieldLabel>Branches</FieldLabel>
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {branches.length ? (
                  branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={form.branchIds.includes(b.id)}
                        onCheckedChange={(checked) => {
                          set({
                            branchIds: checked
                              ? [...form.branchIds, b.id]
                              : form.branchIds.filter((id) => id !== b.id),
                          });
                        }}
                      />
                      {b.name}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No branches loaded.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Enrolment open from</FieldLabel>
              <Input
                type="date"
                value={form.enrolmentOpenFrom}
                onChange={(e) => set({ enrolmentOpenFrom: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Enrolment open to</FieldLabel>
              <Input
                type="date"
                value={form.enrolmentOpenTo}
                onChange={(e) => set({ enrolmentOpenTo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Max enrolments (optional)</FieldLabel>
            <Input
              type="number"
              min={1}
              value={form.maxEnrolments}
              onChange={(e) =>
                set({
                  maxEnrolments:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </div>

          <ToggleRow
            label="Visible in customer app"
            detail="Shows on Explore plans when the plan is active."
            checked={form.visibleInCustomerApp}
            onCheckedChange={(visibleInCustomerApp) =>
              set({ visibleInCustomerApp })
            }
          />
          <ToggleRow
            label="Customer self-enrol allowed"
            detail="When off, staff can still enrol customers from admin."
            checked={form.customerSelfEnrolAllowed}
            onCheckedChange={(customerSelfEnrolAllowed) =>
              set({ customerSelfEnrolAllowed })
            }
          />
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={patchState.isLoading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={patchState.isLoading}>
            {patchState.isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save availability"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
