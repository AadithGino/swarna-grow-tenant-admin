"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { toastApiError } from "@/src/lib/api-error";
import { hasPermission } from "@/src/lib/permissions";
import { rupeeInputToPaise } from "@/src/lib/digital-metals-display";
import { useAppSelector } from "@/src/store/hooks";
import {
  useCreateEcommerceBookingPolicyDraftMutation,
  useGetBranchesQuery,
  useGetEcommerceBookingPoliciesQuery,
  useGetEcommerceBookingPolicyAssignmentsQuery,
  useGetEcommerceCategoriesQuery,
  useGetEcommerceProductsQuery,
  usePublishEcommerceBookingPolicyMutation,
  useSetEcommerceBookingPolicyAssignmentMutation,
} from "@/src/store/api/admin-api";
import { bpsLabel, inr, RATE_PROTECTION_WARNING, rateProtectionEndsEarly, RATE_RULE_LABEL } from "@/src/features/ecommerce/ecommerce-booking-ui";

const SCOPE_LABEL: Record<string, string> = {
  BRANCH: "Branch",
  CATEGORY: "Category",
  PRODUCT: "Product",
};

function hoursLabel(h: unknown): string {
  const n = Number(h);
  if (!Number.isFinite(n)) return "—";
  return n >= 48 && n % 24 === 0 ? `${n / 24} days` : `${n} h`;
}

function PolicyTile({ label, value, detail, warn }: { label: string; value: string; detail?: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3 py-2.5", warn ? "bg-amber-50 ring-1 ring-amber-200" : "bg-[#faf6f4]")}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[#857a7d]">{label}</dt>
      <dd className="mt-0.5 text-base font-bold tabular-nums text-[#2a1f22]">{value}</dd>
      {detail ? <dd className="text-[11px] text-[#857a7d]">{detail}</dd> : null}
    </div>
  );
}

type CatalogRow = { id: string; name: string; sku?: string };

function CatalogScopePicker({
  kind,
  value,
  onChange,
}: {
  kind: "PRODUCT" | "CATEGORY";
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const searchKey = `${kind}:${q}`;
  const [paging, setPaging] = useState<{ searchKey: string; cursor?: string }>({ searchKey });
  const [rows, setRows] = useState<{ key: string; items: CatalogRow[] }>({ key: searchKey, items: [] });
  if (paging.searchKey !== searchKey) setPaging({ searchKey });
  const cursor = paging.searchKey === searchKey ? paging.cursor : undefined;

  useEffect(() => {
    const handle = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const args = { limit: 20, ...(q ? { q } : {}), ...(cursor ? { cursor } : {}) };
  const products = useGetEcommerceProductsQuery(args, { skip: kind !== "PRODUCT" });
  const categories = useGetEcommerceCategoriesQuery(
    { ...args, activeOnly: true },
    { skip: kind !== "CATEGORY" },
  );
  const query = kind === "PRODUCT" ? products : categories;
  const page = query.currentData;

  useEffect(() => {
    if (!page?.items) return;
    const incoming = page.items as CatalogRow[];
    setRows((prev) => {
      if (prev.key !== searchKey || !cursor) return { key: searchKey, items: incoming };
      const seen = new Set(prev.items.map((row) => row.id));
      return { key: searchKey, items: [...prev.items, ...incoming.filter((row) => !seen.has(row.id))] };
    });
  }, [page, cursor, searchKey]);

  const visible = rows.key === searchKey ? rows.items : [];
  const nextCursor = typeof page?.meta?.nextCursor === "string" ? page.meta.nextCursor : null;
  const noun = kind === "PRODUCT" ? "product" : "category";
  const selected = visible.find((row) => row.id === value);

  return (
    <div className="grid gap-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${noun}s by name`}
        aria-label={`Search ${noun}s`}
      />
      {selected ? <p className="text-xs text-[#5f5256]">Selected: {selected.name}</p> : null}
      <div className="max-h-52 overflow-y-auto rounded-xl border border-[#e8dcd7]">
        {query.isError ? (
          <p className="px-3 py-3 text-sm text-red-700">Could not load {noun}s.</p>
        ) : visible.length === 0 && !query.isFetching ? (
          <p className="px-3 py-3 text-sm text-[#7a6d70]">No {noun}s match.</p>
        ) : (
          <ul>
            {visible.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#faf6f4]",
                    value === row.id && "bg-[#f6ebe7] font-semibold",
                  )}
                  onClick={() => onChange(row.id)}
                >
                  <span>{row.name}</span>
                  {row.sku ? <span className="text-xs font-normal text-[#857a7d]">{row.sku}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.isFetching ? <p className="px-3 py-2 text-xs text-[#857a7d]">Loading…</p> : null}
        {nextCursor ? (
          <button
            type="button"
            className="w-full border-t border-[#f3eae7] px-3 py-2 text-sm font-semibold text-[#7b0a2b]"
            disabled={query.isFetching}
            onClick={() => setPaging({ searchKey, cursor: nextCursor })}
          >
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function percentToBps(input: string): number | null {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

export function EcommerceBookingPoliciesPage() {
  const user = useAppSelector((s) => s.session.session?.user);
  const canPublish = hasPermission(user, "ecommerce.booking.policy.publish");
  const policies = useGetEcommerceBookingPoliciesQuery();
  const assignments = useGetEcommerceBookingPolicyAssignmentsQuery();
  const branches = useGetBranchesQuery();
  const [createDraft, createState] = useCreateEcommerceBookingPolicyDraftMutation();
  const [publish, publishState] = usePublishEcommerceBookingPolicyMutation();
  const [assign, assignState] = useSetEcommerceBookingPolicyAssignmentMutation();

  const [draftOpen, setDraftOpen] = useState(false);
  const [policyKey, setPolicyKey] = useState("");
  const [name, setName] = useState("");
  const [advanceMode, setAdvanceMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [percent, setPercent] = useState("25");
  const [fixedRupees, setFixedRupees] = useState("");
  const [minRupees, setMinRupees] = useState("");
  const [rateRule, setRateRule] = useState("BOOKED_RATE");
  const [protectionHours, setProtectionHours] = useState("48");
  const [advanceMinutes, setAdvanceMinutes] = useState("30");
  const [balanceHours, setBalanceHours] = useState("72");
  const [feePercent, setFeePercent] = useState("10");
  const [reminders, setReminders] = useState("24, 6");
  const [terms, setTerms] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [scopeType, setScopeType] = useState("BRANCH");
  const [scopeId, setScopeId] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [policyVersionId, setPolicyVersionId] = useState("");

  const versions: Record<string, any>[] = policies.data?.versions ?? [];
  const published = useMemo(() => versions.filter((v) => v.status === "PUBLISHED"), [versions]);
  const versionLabel = (id: string | null) => {
    const v = versions.find((x) => x.id === id);
    return v ? `${v.name} v${v.version}` : "—";
  };
  const branchList: { id: string; name: string; code: string }[] = branches.data?.items ?? [];
  const branchName = (id: string) => branchList.find((b) => b.id === id)?.name ?? id;

  if (policies.isLoading || assignments.isLoading) return <PageSkeleton cards={3} />;
  if (policies.isError || assignments.isError) {
    return (
      <QueryError
        error={policies.error ?? assignments.error}
        onRetry={() => {
          policies.refetch();
          assignments.refetch();
        }}
      />
    );
  }

  function draftBody() {
    const feeBps = percentToBps(feePercent);
    const advance =
      advanceMode === "PERCENT"
        ? (() => {
            const bps = percentToBps(percent);
            const min = minRupees.trim() ? rupeeInputToPaise(minRupees) : 0;
            if (bps == null || bps < 1) return "Enter an advance between 0.01% and 100%.";
            if (min == null) return "Enter a valid minimum advance.";
            return { mode: "PERCENT" as const, percentBps: bps, minPaise: min };
          })()
        : (() => {
            const paise = rupeeInputToPaise(fixedRupees);
            if (paise == null || paise < 1) return "Enter a fixed advance amount.";
            return { mode: "FIXED" as const, fixedPaise: paise };
          })();
    if (typeof advance === "string") return advance;
    if (feeBps == null) return "Enter a cancellation fee between 0% and 100%.";
    const reminderHours = reminders
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number);
    if (reminderHours.some((n) => !Number.isInteger(n) || n < 1)) return "Reminder hours must be whole numbers, like 24, 6.";
    if (!policyKey.trim() || !name.trim()) return "Give the policy a key and a name.";
    return {
      policyKey: policyKey.trim(),
      name: name.trim(),
      advance,
      rateRule,
      rateProtectionHours: Number(protectionHours) || 0,
      advanceWindowMinutes: Number(advanceMinutes) || 30,
      balanceWindowHours: Number(balanceHours) || 72,
      cancellationFeeBps: feeBps,
      reminderHoursBeforeDue: reminderHours,
      terms: { text: terms },
    };
  }

  async function submitDraft() {
    const body = draftBody();
    if (typeof body === "string") {
      toast.error(body);
      throw new Error(body);
    }
    try {
      await createDraft(body).unwrap();
      toast.success("Draft saved. Publish it to make it usable.");
      setDraftOpen(false);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  async function submitAssignment() {
    if (!scopeId.trim()) {
      toast.error("Choose where this applies.");
      throw new Error("scope");
    }
    if (bookingEnabled && !policyVersionId) {
      toast.error("Choose a published policy.");
      throw new Error("policy");
    }
    try {
      await assign({
        scopeType,
        scopeId: scopeId.trim(),
        bookingEnabled,
        policyVersionId: bookingEnabled ? policyVersionId : null,
      }).unwrap();
      toast.success("Assignment saved");
      setAssignOpen(false);
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  const grouped = versions.reduce<Record<string, Record<string, any>[]>>((acc, v) => {
    (acc[v.policyKey] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/ecommerce/bookings", label: "All bookings" }}
        eyebrow="Online store · Advance bookings"
        icon={ScrollText}
        title="Booking policies"
        description="What customers agree to when they reserve an ornament: the advance, how long the gold rate is protected, the deadlines and the cancellation fee. A published policy never changes; make a new version instead."
        actions={
          canPublish ? (
            <Button className="rounded-xl" onClick={() => setDraftOpen(true)}>
              <Plus /> New policy version
            </Button>
          ) : null
        }
      />
      {!canPublish ? (
        <Notice tone="blue">You can view policies here. Publishing them needs the booking policy permission.</Notice>
      ) : null}
      <Notice tone="wine" icon={ScrollText}>
        Bookings are for branch pickup only, with an advance taken as a percentage (or fixed amount) of the estimated total, for one piece of a tracked item.
      </Notice>

      <Surface title="Policy versions">
        {versions.length === 0 ? (
          <EmptyState title="No policies yet" detail="Create a policy version, publish it, then choose where it applies." icon={ScrollText} />
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2 2xl:grid-cols-3">
            {Object.entries(grouped).flatMap(([key, rows]) =>
                  rows.map((v) => {
                    const warn = v.rateProtectionEndsBeforeBalanceDeadline ?? rateProtectionEndsEarly(v);
                    const inUse = (assignments.data?.assignments ?? []).filter((x: Record<string, any>) => x.bookingEnabled && x.policyVersionId === v.id).length;
                    return (
                      <article key={v.id} className={cn("flex flex-col rounded-2xl border bg-white p-4", v.status === "PUBLISHED" ? "border-[#e2cfc8]" : "border-dashed border-[#e2d6d2] bg-[#fdfbfa]")}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#a3979a]">{key}</p>
                            <p className="flex items-center gap-2 font-semibold text-[#2a1f22]">
                              {v.name} <span className="text-sm font-normal text-[#857a7d]">v{v.version}</span>
                              <StatusBadge status={v.status} />
                            </p>
                            <p className="mt-0.5 text-xs text-[#857a7d]">
                              {v.status === "PUBLISHED" ? (inUse ? `Used in ${inUse} place${inUse === 1 ? "" : "s"}` : "Published · not assigned yet") : "Draft · customers do not see it"}
                            </p>
                          </div>
                          {canPublish && v.status === "DRAFT" ? (
                            <Button
                              size="sm"
                              className="rounded-lg"
                              disabled={publishState.isLoading}
                              onClick={async () => {
                                try {
                                  await publish({ policyVersionId: v.id }).unwrap();
                                  toast.success("Policy published");
                                } catch (err) {
                                  toastApiError(err);
                                }
                              }}
                            >
                              Publish
                            </Button>
                          ) : null}
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <PolicyTile
                            label="Advance"
                            value={v.advance?.mode === "PERCENT" ? bpsLabel(v.advance.percentBps) : inr(v.advance?.fixedPaise)}
                            detail={v.advance?.mode === "PERCENT" && v.advance.minPaise ? `min ${inr(v.advance.minPaise)}` : v.advance?.mode === "PERCENT" ? "of estimate" : "fixed"}
                          />
                          <PolicyTile label="Pay advance in" value={`${v.advanceWindowMinutes} min`} detail="or it is released" />
                          <PolicyTile label="Balance due in" value={hoursLabel(v.balanceWindowHours)} detail="after the advance" />
                          <PolicyTile label="Rate protected" value={v.rateRule === "BILLING_DAY" ? "No" : hoursLabel(v.rateProtectionHours)} detail={v.rateRule === "BILLING_DAY" ? "billing-day rate" : "from the advance"} warn={warn} />
                          <PolicyTile label="Cancel fee" value={bpsLabel(v.cancellationFeeBps)} detail="of the advance" />
                          <PolicyTile label="Reminders" value={v.reminderHoursBeforeDue?.length ? v.reminderHoursBeforeDue.map((h: number) => `${h}h`).join(", ") : "None"} detail="before due" />
                        </dl>
                        <p className="mt-3 text-xs text-[#7a6d70]">Gold rate: {RATE_RULE_LABEL[v.rateRule] ?? v.rateRule}</p>
                        {warn ? (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                            <AlertTriangle className="mt-px size-3.5 shrink-0" /> {RATE_PROTECTION_WARNING}
                          </p>
                        ) : null}
                      </article>
                    );
                  }),
            )}
          </div>
        )}
      </Surface>

      <Surface
        title="Where policies apply"
        description="A product's own setting beats its category's, which beats the branch's. Turning booking off at a level stops the search there."
        action={
          canPublish ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScopeType("BRANCH");
                setScopeId("");
                setBookingEnabled(true);
                setPolicyVersionId(published[0]?.id ?? "");
                setAssignOpen(true);
              }}
            >
              <Plus /> Set assignment
            </Button>
          ) : null
        }
      >
        {(assignments.data?.assignments ?? []).length === 0 ? (
          <EmptyState title="Booking is off everywhere" detail="Assign a published policy to a branch to let customers book there." icon={ScrollText} />
        ) : (
          <ul className="divide-y divide-[#f3eae7] text-sm">
            {(assignments.data?.assignments ?? []).map((a: Record<string, any>) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span>
                  <span className="font-semibold">{SCOPE_LABEL[a.scopeType] ?? a.scopeType}</span>{" "}
                  {a.scopeType === "BRANCH" ? branchName(a.scopeId) : (a.scopeName || a.scopeId)}
                </span>
                <span className="flex items-center gap-2 text-[#5f5256]">
                  {a.bookingEnabled ? versionLabel(a.policyVersionId) : "Booking off"}
                  <StatusBadge status={a.bookingEnabled ? "ACTIVE" : "INACTIVE"} label={a.bookingEnabled ? "On" : "Off"} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <ActionDialog
        open={draftOpen}
        onOpenChange={setDraftOpen}
        title="New policy version"
        description="Saved as a draft. Nothing changes for customers until you publish it and assign it."
        actionLabel="Save draft"
        submitDisabled={createState.isLoading}
        onSubmit={submitDraft}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Policy key</FieldLabel>
              <Input value={policyKey} onChange={(e) => setPolicyKey(e.target.value)} placeholder="standard" />
            </div>
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard booking" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Advance type</FieldLabel>
              <Select value={advanceMode} onValueChange={(v) => setAdvanceMode(v as "PERCENT" | "FIXED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage of the estimated total</SelectItem>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {advanceMode === "PERCENT" ? (
              <div>
                <FieldLabel>Advance (%)</FieldLabel>
                <Input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
              </div>
            ) : (
              <div>
                <FieldLabel>Advance (₹)</FieldLabel>
                <Input inputMode="decimal" value={fixedRupees} onChange={(e) => setFixedRupees(e.target.value)} />
              </div>
            )}
          </div>
          {advanceMode === "PERCENT" ? (
            <div>
              <FieldLabel>Minimum advance (₹, optional)</FieldLabel>
              <Input inputMode="decimal" value={minRupees} onChange={(e) => setMinRupees(e.target.value)} />
            </div>
          ) : null}
          <div>
            <FieldLabel>Gold rate on the final bill</FieldLabel>
            <Select value={rateRule} onValueChange={setRateRule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RATE_RULE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Rate protected (hours)</FieldLabel>
              <Input inputMode="numeric" value={protectionHours} onChange={(e) => setProtectionHours(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Pay advance within (min)</FieldLabel>
              <Input inputMode="numeric" value={advanceMinutes} onChange={(e) => setAdvanceMinutes(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Balance within (hours)</FieldLabel>
              <Input inputMode="numeric" value={balanceHours} onChange={(e) => setBalanceHours(e.target.value)} />
            </div>
          </div>
          {rateProtectionEndsEarly({ rateRule, rateProtectionHours: protectionHours, balanceWindowHours: balanceHours }) ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
              {RATE_PROTECTION_WARNING} Raise “Rate protected” to at least the balance hours to keep the promise for the whole balance window.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Cancellation fee (% of advance)</FieldLabel>
              <Input inputMode="decimal" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Balance reminders (hours before)</FieldLabel>
              <Input value={reminders} onChange={(e) => setReminders(e.target.value)} placeholder="24, 6" />
            </div>
          </div>
          <p className="text-xs text-[#857a7d]">Pickup branches: the policy applies to every branch it is assigned to.</p>
          <div>
            <FieldLabel>Terms shown to the customer</FieldLabel>
            <Textarea rows={6} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </div>
      </ActionDialog>

      <ActionDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Set where a policy applies"
        actionLabel="Save"
        submitDisabled={assignState.isLoading}
        onSubmit={submitAssignment}
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Applies to</FieldLabel>
            <Select
              value={scopeType}
              onValueChange={(v) => {
                setScopeType(v);
                setScopeId("");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>{SCOPE_LABEL[scopeType]}</FieldLabel>
            {scopeType === "BRANCH" ? (
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger><SelectValue placeholder="Choose a branch" /></SelectTrigger>
                <SelectContent>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <CatalogScopePicker
                key={scopeType}
                kind={scopeType === "PRODUCT" ? "PRODUCT" : "CATEGORY"}
                value={scopeId}
                onChange={setScopeId}
              />
            )}
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e8dcd7] p-3 text-sm">
            <span className="font-semibold">Allow booking here</span>
            <Switch checked={bookingEnabled} onCheckedChange={setBookingEnabled} aria-label="Allow booking" />
          </label>
          {bookingEnabled ? (
            <div>
              <FieldLabel>Published policy</FieldLabel>
              <Select value={policyVersionId} onValueChange={setPolicyVersionId}>
                <SelectTrigger><SelectValue placeholder="Choose a policy" /></SelectTrigger>
                <SelectContent>
                  {published.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name} v{v.version}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {published.length === 0 ? <p className="mt-1 text-xs text-amber-700">Publish a policy first.</p> : null}
            </div>
          ) : null}
        </div>
      </ActionDialog>
    </div>
  );
}
