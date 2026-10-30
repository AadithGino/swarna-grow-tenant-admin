"use client";

import { useMemo, useState } from "react";
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
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { TrendChart } from "@/src/components/admin-ui/trend-chart";
import { toastApiError } from "@/src/lib/api-error";
import {
  useGetEcommerceGoldRatesCurrentQuery,
  useGetEcommerceGoldRatesHistoryQuery,
  useSetEcommerceGoldRateMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceStoreSettingsTabs } from "@/src/features/ecommerce/ecommerce-settings-ui";
import { Switch } from "@/components/ui/switch";
import { useAppSelector } from "@/src/store/hooks";
import { hasPermission } from "@/src/lib/permissions";
import {
  DATETIME_LOCAL_TIMEZONE_LABEL,
  datetimeLocalValueToUtcIso,
  utcIsoToDatetimeLocalValue,
} from "@/src/lib/datetime-local";
import { ecommerceGoldRateNotificationPreview } from "@/src/lib/gold-rate-notification-ui";

export function EcommerceGoldRatesPage() {
  const current = useGetEcommerceGoldRatesCurrentQuery();
  const history = useGetEcommerceGoldRatesHistoryQuery({ limit: 20 });
  const [setRate] = useSetEcommerceGoldRateMutation();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [open, setOpen] = useState(false);
  const [effectiveMode, setEffectiveMode] = useState<"NOW" | "SCHEDULED">("NOW");
  const [purity, setPurity] = useState("22K");
  const [rateRupee, setRateRupee] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(() =>
    utcIsoToDatetimeLocalValue(new Date().toISOString()),
  );
  const [notifyCustomers, setNotifyCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const user = useAppSelector((s) => s.session.session?.user);
  const canNotify = hasPermission(user, "message.send");

  const notifyPreview = useMemo(() => {
    if (!notifyCustomers || !canNotify) return null;
    const rupees = Number(rateRupee);
    if (!Number.isFinite(rupees) || rupees <= 0) return null;
    const iso =
      effectiveMode === "NOW" ? new Date().toISOString() : datetimeLocalValueToUtcIso(effectiveAt);
    const scheduled = effectiveMode === "SCHEDULED" && iso
      ? new Date(iso).getTime() > Date.now() + 60_000
      : false;
    return ecommerceGoldRateNotificationPreview({
      purity,
      ratePerGramRupee: rupees,
      effectiveAtLocal: iso ?? effectiveAt,
      timezoneLabel: DATETIME_LOCAL_TIMEZONE_LABEL,
      scheduled,
    });
  }, [notifyCustomers, canNotify, rateRupee, purity, effectiveAt]);

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
    if (!entitled || submitting) {
      if (!entitled) toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    const rupees = Number(rateRupee);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error("Enter a valid rate per gram in rupees.");
      return;
    }
    if (effectiveMode === "SCHEDULED") {
      const effectiveIso = datetimeLocalValueToUtcIso(effectiveAt);
      if (!effectiveIso) {
        toast.error("Enter a valid effective date and time.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const result = await setRate({
        purity,
        ratePerGramPaise: Math.round(rupees * 100),
        ...(effectiveMode === "NOW"
          ? { effectiveTiming: "NOW" as const }
          : {
              effectiveTiming: "SCHEDULED" as const,
              effectiveAt: datetimeLocalValueToUtcIso(effectiveAt)!,
            }),
        ...(notifyCustomers && canNotify ? { notification: { enabled: true } } : {}),
      }).unwrap();
      toast.success("Gold rate published");
      const promo = result.notification as Record<string, unknown> | undefined;
      if (promo?.enqueued || promo?.queued) {
        toast.success("Customer notification queued");
      } else if (promo?.intentPersisted && promo?.enqueueError) {
        toast.message("Notification saved — delivery pending");
      } else if (promo?.scheduled) {
        toast.message("Notification scheduled for effective time");
      } else if (promo?.skipped && promo?.reason) {
        toast.message("Notification skipped", { description: String(promo.reason) });
      }
      setOpen(false);
      setNotifyCustomers(false);
      current.refetch();
      history.refetch();
    } catch (err) {
      toastApiError(err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  const rateRows = current.data?.rates ?? [];

  const historyItems = (history.data?.items ?? []) as Record<string, any>[];
  const purities = Array.from(new Set(historyItems.map((r) => String(r.purity)))).sort();
  const chartPurity = purities.includes("22K") ? "22K" : purities[0];
  const chartPoints = historyItems
    .filter((r) => String(r.purity) === chartPurity && r.ratePerGramPaise != null)
    .slice()
    .sort((a, b) => String(a.effectiveAt ?? "").localeCompare(String(b.effectiveAt ?? "")))
    .map((r) => ({
      label: r.effectiveAt ? new Date(r.effectiveAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
      value: Number(r.ratePerGramPaise),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store · Store settings"
        icon={Scale}
        title="Gold rates"
        description="Your shop's own price per gram for each purity. Publishing a rate re-prices the catalogue straight away."
        actions={
          <Button
            type="button"
            className="rounded-xl"
            disabled={!entitled}
            onClick={() => {
              setEffectiveMode("NOW");
              setNotifyCustomers(false);
              setOpen(true);
            }}
          >
            <Plus /> Publish rate
          </Button>
        }
      />
      <EcommerceStoreSettingsTabs />
      {!entitled ? <Notice tone="amber">{disabledMessage}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {rateRows.map((row) => {
          const set = Boolean(row.ratePerGram?.amountDisplay);
          return (
            <button
              key={row.purity}
              type="button"
              disabled={!entitled}
              onClick={() => {
                setPurity(String(row.purity));
                setEffectiveMode("NOW");
                setNotifyCustomers(false);
                setOpen(true);
              }}
              className="group relative overflow-hidden rounded-[1.15rem] border border-[#ead9b8] bg-gradient-to-br from-[#fffaf0] via-[#fbf0d9] to-[#f3e0b6] p-5 text-left transition-shadow hover:shadow-[0_14px_30px_-20px_rgba(154,98,0,0.6)] disabled:cursor-default"
            >
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.75),transparent_70%)]" />
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-sm font-extrabold text-[#7a4f0e] shadow-sm">{row.purity}</span>
                <span className="text-xs font-semibold text-[#9a6f2a] opacity-0 transition-opacity group-hover:opacity-100">Update</span>
              </div>
              <p className="mt-4 text-[0.8rem] font-medium text-[#8a6a3a]">Per gram</p>
              <p className={`text-[1.9rem] font-extrabold tabular-nums tracking-tight ${set ? "text-[#3d2508]" : "text-[#b59a6e]"}`}>
                {row.ratePerGram?.amountDisplay ?? "Not set"}
              </p>
              <p className="mt-1 text-xs text-[#8a6a3a]">
                {row.effectiveAt
                  ? `Since ${new Date(row.effectiveAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                  : "Products in this purity show “price unavailable”"}
              </p>
            </button>
          );
        })}
        {rateRows.length === 0 ? (
          <div className="col-span-full rounded-[1.15rem] border border-[#e8dcd7] bg-white">
            <EmptyState icon={Scale} title="No rates yet" detail="Publish a rate for each purity you sell." />
          </div>
        ) : null}
      </div>
      <Notice tone="wine" icon={Scale}>
        Each purity needs its own rate. A missing or stale rate makes those products&apos; prices unavailable — the shop never borrows
        another purity&apos;s rate or your scheme gold rate.
      </Notice>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Surface title={chartPurity ? `${chartPurity} rate trend` : "Rate trend"} description="Every published rate, newest on the right">
          <div className="px-5 pb-4 pt-3">
            {chartPoints.length > 1 ? (
              <TrendChart ariaLabel="Store gold rate history" points={chartPoints} format={(v) => `₹${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/g`} height={200} />
            ) : (
              <p className="py-10 text-center text-sm text-[#7a6d70]">Publish a few rates to see the trend.</p>
            )}
          </div>
        </Surface>
        <Surface title="Rate history" description="Latest published rates across all purities">
          <ul className="max-h-[22rem] divide-y divide-[#f3eae7] overflow-y-auto text-sm">
            {historyItems.slice(0, 30).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex items-center gap-2">
                  <span className="inline-flex rounded-md bg-[#fbf1dc] px-2 py-0.5 text-xs font-bold text-[#7a4f0e]">{row.purity}</span>
                  <span className="font-semibold tabular-nums text-[#28161a]">{row.ratePerGram?.amountDisplay ?? row.ratePerGram ?? "—"}</span>
                </span>
                <span className="text-xs text-[#857a7d]">
                  {row.effectiveAt ? new Date(row.effectiveAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                </span>
              </li>
            ))}
            {historyItems.length === 0 ? <li className="px-5 py-8 text-center text-[#7a6d70]">No history yet.</li> : null}
          </ul>
        </Surface>
      </div>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Publish ecommerce gold rate"
        actionLabel="Save rate"
        submitDisabled={!entitled || submitting}
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
            <FieldLabel>Effective time</FieldLabel>
            <Select
              value={effectiveMode}
              onValueChange={(v) => setEffectiveMode(v as "NOW" | "SCHEDULED")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOW">Now (server time at publish)</SelectItem>
                <SelectItem value="SCHEDULED">Schedule specific time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {effectiveMode === "SCHEDULED" ? (
            <div>
              <FieldLabel>Effective at</FieldLabel>
              <Input
                type="datetime-local"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Times use {DATETIME_LOCAL_TIMEZONE_LABEL}. Past times will not send a current-rate
                notification.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Effective time is resolved on the server when you publish (not when this dialog opened).
            </p>
          )}
          {canNotify ? (
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium text-[#28161a]">Notify customers</p>
                <p className="text-xs text-muted-foreground">
                  Optional push when this shop rate becomes effective.
                </p>
              </div>
              <Switch checked={notifyCustomers} onCheckedChange={setNotifyCustomers} />
            </div>
          ) : null}
          {notifyPreview ? (
            <div className="rounded-xl border border-[#eaded9] bg-[#faf6f1] p-4 text-sm">
              <p className="font-semibold text-[#4c2631]">{notifyPreview.purpose}</p>
              <p className="mt-2 font-medium">{notifyPreview.title}</p>
              <p className="mt-1 text-muted-foreground">{notifyPreview.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{notifyPreview.scheduleNote}</p>
            </div>
          ) : null}
        </div>
      </ActionDialog>
    </div>
  );
}