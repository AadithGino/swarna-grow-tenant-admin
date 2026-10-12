"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ECOMMERCE_ORDER_PAYMENT_FILTERS,
  ECOMMERCE_ORDER_STATUS_FILTERS,
  emptyEcommerceOrdersListFilters,
  type EcommerceOrdersListFiltersState,
} from "@/src/lib/ecommerce-orders-list-filters";

export type { EcommerceOrdersListFiltersState };

export function ecommerceOrdersListFiltersActive(state: EcommerceOrdersListFiltersState) {
  return (
    state.q.trim().length >= 2
    || state.status !== "ALL"
    || state.paymentMethod !== "ALL"
    || Boolean(state.createdFrom.trim())
    || Boolean(state.createdTo.trim())
    || state.period !== "THIS_MONTH"
  );
}

type Props = {
  state: EcommerceOrdersListFiltersState;
  onChange: (next: EcommerceOrdersListFiltersState) => void;
  resultCount: number;
  pageCount: number;
  loading?: boolean;
};

export function EcommerceOrdersListToolbar({
  state,
  onChange,
  resultCount,
  pageCount,
  loading,
}: Props) {
  const active = ecommerceOrdersListFiltersActive(state);

  function patch(partial: Partial<EcommerceOrdersListFiltersState>) {
    onChange({ ...state, ...partial });
  }

  return (
    <div className="mb-5 space-y-4 rounded-2xl border border-[#e4d7d2] bg-white p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="orders-search" className="text-xs font-semibold uppercase tracking-wide text-[#9a6f2a]">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="orders-search"
              value={state.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Order #, customer name, mobile, or ID…"
              className="pl-9"
              aria-describedby="orders-search-hint"
            />
          </div>
          <p id="orders-search-hint" className="text-[11px] text-muted-foreground">
            Min 2 characters · searches order number and customer ID on the server
          </p>
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#9a6f2a]">Status</Label>
            <Select value={state.status} onValueChange={(value) => patch({ status: value })}>
              <SelectTrigger aria-label="Filter by order status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ECOMMERCE_ORDER_STATUS_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-[#9a6f2a]">Payment</Label>
            <Select value={state.paymentMethod} onValueChange={(value) => patch({ paymentMethod: value })}>
              <SelectTrigger aria-label="Filter by payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ECOMMERCE_ORDER_PAYMENT_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#eaded9] pt-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="orders-from" className="text-xs text-muted-foreground">
            Placed from
          </Label>
          <Input
            id="orders-from"
            type="date"
            value={state.createdFrom}
            onChange={(e) => patch({ createdFrom: e.target.value })}
            className="w-full sm:w-[11rem]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orders-to" className="text-xs text-muted-foreground">
            Placed to
          </Label>
          <Input
            id="orders-to"
            type="date"
            value={state.createdTo}
            onChange={(e) => patch({ createdTo: e.target.value })}
            className="w-full sm:w-[11rem]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Period (summary KPIs)</Label>
          <Select value={state.period} onValueChange={(value) => patch({ period: value })}>
            <SelectTrigger className="w-full sm:w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THIS_MONTH">This month</SelectItem>
              <SelectItem value="THIS_WEEK">This week</SelectItem>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="LAST_MONTH">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${pageCount} on page · ${resultCount} matching total`}
          </p>
          {active ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => onChange(emptyEcommerceOrdersListFilters())}
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
