"use client";

import { useState } from "react";
import { Plus, Scale } from "lucide-react";
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
import {
  FieldLabel,
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import {
  useGetEcommerceGoldRatesCurrentQuery,
  useGetEcommerceGoldRatesHistoryQuery,
  useSetEcommerceGoldRateMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";

export function EcommerceGoldRatesPage() {
  const current = useGetEcommerceGoldRatesCurrentQuery();
  const history = useGetEcommerceGoldRatesHistoryQuery({ limit: 20 });
  const [setRate] = useSetEcommerceGoldRateMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [open, setOpen] = useState(false);
  const [purity, setPurity] = useState("22K");
  const [rateRupee, setRateRupee] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );

  if (current.isLoading || history.isLoading) return <PageSkeleton cards={3} />;
  if (current.isError || history.isError) {
    return (
      <QueryError
        error={current.error ?? history.error}
        onRetry={() => {
          current.refetch();
          history.refetch();
        }}
      />
    );
  }

  async function submitRate() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    const rupees = Number(rateRupee);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error("Enter a valid rate per gram in rupees.");
      return;
    }
    try {
      await setRate({
        purity,
        ratePerGramPaise: Math.round(rupees * 100),
        effectiveAt: new Date(effectiveAt).toISOString(),
      }).unwrap();
      toast.success("Gold rate published");
      setOpen(false);
      current.refetch();
      history.refetch();
    } catch (err) {
      toastApiError(err);
      throw err;
    }
  }

  const rateRows = current.data?.rates ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Store gold rates"
        description="Set an independent price per purity. Published prices update the online catalog automatically."
        actions={
          <Button type="button" disabled={!entitled} onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" /> Publish rate
          </Button>
        }
      />
      <EcommerceSectionNav />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <div className="mb-5 rounded-2xl border border-[#eadfd6] bg-[#faf5ee] p-5 text-sm leading-6 text-[#665557]">
        Each purity needs its own rate. Missing or stale rates make affected product prices unavailable;
        they never fall back to another purity.
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rateRows.map((row) => {
          const display = row.ratePerGram?.amountDisplay ?? "Not set";
          return (
            <StatCard
              key={row.purity}
              icon={Scale}
              tone="gold"
              label={`${row.purity} · per gram`}
              value={
                <span className="font-mono tabular-nums tracking-tight">{display}</span>
              }
              detail={
                row.effectiveAt
                  ? `Effective ${new Date(row.effectiveAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`
                  : "Publish a rate for this purity"
              }
            />
          );
        })}
        {rateRows.length === 0 ? (
          <Surface className="col-span-full">
            <p className="p-6 text-sm text-muted-foreground">
              No purities configured yet. Publish a rate to get started.
            </p>
          </Surface>
        ) : null}
      </div>
      <Surface title="Rate history" description="Latest published rates across all purities.">
        <ul className="divide-y divide-[#eaded9] text-sm">
          {(history.data?.items ?? []).slice(0, 20).map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium text-[#2d191d]">
                <span className="mr-2 inline-flex rounded-md bg-[#fff7df] px-2 py-0.5 text-xs font-bold text-[#815b1d]">
                  {row.purity}
                </span>
                <span className="font-mono tabular-nums text-[#28161a]">
                  {row.ratePerGram?.amountDisplay ?? "—"}
                </span>
              </span>
              <span className="text-xs text-[#807478] sm:text-sm">
                {row.effectiveAt
                  ? new Date(row.effectiveAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"}
              </span>
            </li>
          ))}
          {(history.data?.items ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-muted-foreground">No history yet.</li>
          ) : null}
        </ul>
      </Surface>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish ecommerce gold rate"
        actionLabel="Save rate"
        submitDisabled={!entitled}
        onSubmit={submitRate}
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Purity</FieldLabel>
            <Select value={purity} onValueChange={setPurity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["18K", "22K", "24K"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Rate per gram (₹)</FieldLabel>
            <Input
              value={rateRupee}
              onChange={(e) => setRateRupee(e.target.value)}
              inputMode="decimal"
              className="h-12 font-mono text-lg font-semibold tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Effective at</FieldLabel>
            <Input
              type="datetime-local"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
            />
          </div>
        </div>
      </ActionDialog>
    </>
  );
}
