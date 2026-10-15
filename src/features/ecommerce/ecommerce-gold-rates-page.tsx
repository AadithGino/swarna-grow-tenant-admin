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
import {
  EcommerceCatalogNav,
  EcommerceSettingsHint,
} from "@/src/features/ecommerce/ecommerce-settings-ui";
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

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Store gold rates"
        description="Set an independent price per purity. Published prices update the online catalog automatically."
        actions={
          <Button
            type="button"
            disabled={!entitled}
            onClick={() => {
              setEffectiveMode("NOW");
              setNotifyCustomers(false);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Publish rate
          </Button>
        }
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <EcommerceCatalogNav />
      <EcommerceSettingsHint icon={Scale} title="Store pricing">
        Each purity needs its own rate. Missing or stale rates make affected product prices
        unavailable — they never fall back to another purity or scheme gold rates.
      </EcommerceSettingsHint>
      <div className="mb-6 mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    </>
  );
}
