"use client";

import type { ReactNode } from "react";
import { CalendarRange, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { Surface } from "@/src/components/common/page-parts";
import {
  ADMIN_REPORT_LABELS,
  ECOMMERCE_ADMIN_REPORT_KEYS,
  SCHEME_ADMIN_REPORT_KEYS,
  type AdminReportKey,
} from "@/src/types/admin-report";
import { cn } from "@/lib/utils";

const filterSelectTriggerClass =
  "h-10 w-full rounded-lg border border-[#eaded9] bg-[#faf6f7] px-3 text-sm font-medium text-[#28161a] shadow-none focus:ring-2 focus:ring-[#730321]/15";

function FilterSegment({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 bg-white px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a6f2a]">
        {label}
      </span>
      {children}
    </div>
  );
}

type BranchOption = { id: string; name: string; code?: string };
type PlanOption = { id: string; name: string; code?: string };
type CustomerOption = {
  id: string;
  name: string;
  customerNo: string;
  mobile?: string;
};

export function ReportFiltersPanel({
  reportKey,
  onReportKeyChange,
  from,
  to,
  onFromChange,
  onToChange,
  dateRangeError,
  showBranchFilter,
  reportBranchId,
  onReportBranchIdChange,
  branches,
  showPlanFilter,
  planId,
  onPlanIdChange,
  plans,
  groupBy,
  onGroupByChange,
  showBranchFocus,
  focusBranchId,
  onFocusBranchIdChange,
  showSchemeFocus,
  focusPlanId,
  onFocusPlanIdChange,
  showCustomerFocus,
  customerFocusMode,
  onCustomerFocusModeChange,
  customerSearch,
  onCustomerSearchChange,
  customerSearchError,
  customerId,
  onCustomerIdChange,
  customerOptions,
  customerLedgerError,
  customersLoading,
  onApply,
  applyDisabled,
  showEcommerceReportOptions = false,
}: {
  reportKey: AdminReportKey;
  onReportKeyChange: (key: AdminReportKey) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  dateRangeError?: string;
  showBranchFilter: boolean;
  reportBranchId: string;
  onReportBranchIdChange: (value: string) => void;
  branches: BranchOption[];
  showPlanFilter: boolean;
  planId: string;
  onPlanIdChange: (value: string) => void;
  plans: PlanOption[];
  groupBy: string;
  onGroupByChange: (value: string) => void;
  showBranchFocus: boolean;
  focusBranchId: string;
  onFocusBranchIdChange: (value: string) => void;
  showSchemeFocus: boolean;
  focusPlanId: string;
  onFocusPlanIdChange: (value: string) => void;
  showCustomerFocus: boolean;
  customerFocusMode: "ALL" | "INDIVIDUAL";
  onCustomerFocusModeChange: (mode: "ALL" | "INDIVIDUAL") => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  customerSearchError?: string;
  customerId: string;
  onCustomerIdChange: (value: string) => void;
  customerOptions: CustomerOption[];
  customerLedgerError?: string;
  customersLoading: boolean;
  onApply: () => void;
  applyDisabled: boolean;
  showEcommerceReportOptions?: boolean;
}) {
  const primaryFilterCount =
    1 +
    (showBranchFocus || showBranchFilter ? 1 : 0) +
    (showSchemeFocus || showPlanFilter ? 1 : 0) +
    (reportKey === "COLLECTION" ? 1 : 0) +
    (showCustomerFocus ? 1 : 0);

  const gridCols =
    primaryFilterCount >= 4
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : primaryFilterCount === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : primaryFilterCount === 2
          ? "sm:grid-cols-2"
          : "grid-cols-1";

  return (
    <Surface className="overflow-visible">
      <div className="flex flex-col gap-4 border-b border-[#efe6ea] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7ecee] text-[#730321]">
            <SlidersHorizontal className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-[#2d191d]">Report filters</h2>
            <p className="text-sm text-[#776a6d]">
              Choose scope and period, then apply to refresh the report.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#776a6d]">
          <CalendarRange className="size-4 text-[#9a6f2a]" />
          <span>
            {from} → {to}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div
          className={cn(
            "grid gap-px overflow-hidden rounded-xl border border-[#e8dde2] bg-[#e8dde2] shadow-sm",
            gridCols,
          )}
        >
          <FilterSegment label="Report">
            <Select
              value={reportKey}
              onValueChange={(v) => onReportKeyChange(v as AdminReportKey)}
            >
              <SelectTrigger className={filterSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEME_ADMIN_REPORT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ADMIN_REPORT_LABELS[key]}
                  </SelectItem>
                ))}
                {showEcommerceReportOptions
                  ? ECOMMERCE_ADMIN_REPORT_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {ADMIN_REPORT_LABELS[key]}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </FilterSegment>

          {showBranchFocus && (
            <FilterSegment label="Showroom focus">
              <Select value={focusBranchId} onValueChange={onFocusBranchIdChange}>
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue placeholder="All showrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All showrooms (comparison)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSegment>
          )}

          {showSchemeFocus && (
            <FilterSegment label="Scheme focus">
              <Select value={focusPlanId} onValueChange={onFocusPlanIdChange}>
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue placeholder="All schemes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All schemes (comparison)</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSegment>
          )}

          {showCustomerFocus && (
            <FilterSegment label="Customer focus">
              <Select
                value={customerFocusMode}
                onValueChange={(value) =>
                  onCustomerFocusModeChange(value as "ALL" | "INDIVIDUAL")
                }
              >
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All customers (overview)</SelectItem>
                  <SelectItem value="INDIVIDUAL">
                    Individual customer (ledger)
                  </SelectItem>
                </SelectContent>
              </Select>
            </FilterSegment>
          )}

          {showBranchFilter && (
            <FilterSegment label="Showroom">
              <Select
                value={reportBranchId}
                onValueChange={onReportBranchIdChange}
              >
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue placeholder="All showrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All showrooms</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSegment>
          )}

          {showPlanFilter && (
            <FilterSegment label="Scheme plan">
              <Select value={planId} onValueChange={onPlanIdChange}>
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All plans</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.code ? ` (${p.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSegment>
          )}

          {reportKey === "COLLECTION" && (
            <FilterSegment label="Group by">
              <Select value={groupBy} onValueChange={onGroupByChange}>
                <SelectTrigger className={filterSelectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRANCH">Branch</SelectItem>
                  <SelectItem value="DAY">Day</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="MODE">Mode</SelectItem>
                  <SelectItem value="PLAN">Plan</SelectItem>
                </SelectContent>
              </Select>
            </FilterSegment>
          )}
        </div>

        {showCustomerFocus && customerFocusMode === "INDIVIDUAL" && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#e8dde2] bg-[#faf6f7]">
            <div className="border-b border-[#efe6ea] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a6f2a]">
                Customer ledger
              </p>
              <p className="mt-1 text-sm text-[#776a6d]">
                Search and pick one customer to load their ledger for the period.
              </p>
            </div>
            <div className="space-y-3 p-4">
              <Input
                className="h-11 rounded-lg border-[#eaded9] bg-white"
                placeholder="Search by name, mobile, or passbook no."
                value={customerSearch}
                onChange={(e) => onCustomerSearchChange(e.target.value)}
                aria-invalid={Boolean(customerSearchError)}
              />
              <FormFieldError message={customerSearchError} />
              <Select
                value={customerId || undefined}
                onValueChange={onCustomerIdChange}
              >
                <SelectTrigger className={cn(filterSelectTriggerClass, "h-11 bg-white")}>
                  <SelectValue placeholder="Select customer for ledger" />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.customerNo}
                      {c.mobile ? ` · ${c.mobile}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormFieldError message={customerLedgerError} />
              <p className="text-xs text-[#776a6d]">
                {customersLoading
                  ? "Loading customers…"
                  : customerOptions.length === 0
                    ? "No customers match — try a different search."
                    : `${customerOptions.length} customer(s) available.`}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e8dde2] bg-gradient-to-r from-[#faf6f7] to-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <DateRangeFilter
              label="Period"
              from={from}
              to={to}
              onFromChange={onFromChange}
              onToChange={onToChange}
              className="w-full max-w-none border-[#eaded9] bg-white/90"
            />
            <FormFieldError message={dateRangeError} />
          </div>
          <Button
            className="h-11 shrink-0 gap-2 px-6"
            disabled={applyDisabled}
            onClick={onApply}
          >
            <SlidersHorizontal className="size-4" />
            Apply filters
          </Button>
        </div>
      </div>
    </Surface>
  );
}
