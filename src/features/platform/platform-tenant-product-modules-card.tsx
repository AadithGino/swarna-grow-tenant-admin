"use client";

import { ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { useSetPlatformProductModulesMutation } from "@/src/store/api/platform-api";
import type { PlatformTenantDetail } from "@/src/types/platform";

type ModuleKey = "ecommerce" | "ecommercePayments" | "digitalMetals";

const ROWS: {
  key: ModuleKey;
  title: string;
  hint: string;
}[] = [
  {
    key: "ecommerce",
    title: "Online shop & advance booking",
    hint: "Catalogue, cart, checkout, and ornament advance booking (plan + tenant store switch).",
  },
  {
    key: "ecommercePayments",
    title: "Shop & scheme checkout payments",
    hint: "PhonePe for shop orders, matured-scheme shop checkout, and related customer payments.",
  },
  {
    key: "digitalMetals",
    title: "Digital gold & silver",
    hint: "Customer buy/sell module (plan + tenant module; tax/terms may still be required on Digital metals tab).",
  },
];

function moduleOn(tenant: PlatformTenantDetail, key: ModuleKey): boolean {
  const features = tenant.subscription?.features as Record<string, boolean> | undefined;
  const settings = tenant.settings as Record<string, boolean | undefined>;
  if (key === "ecommerce") {
    return features?.ecommerce === true && settings?.ecommerceEnabled === true;
  }
  if (key === "ecommercePayments") {
    return (
      features?.ecommercePayments === true
      && settings?.ecommercePaymentsRolloutEnabled === true
    );
  }
  return features?.digitalMetals === true && settings?.digitalMetalsEnabled === true;
}

export function PlatformTenantProductModulesCard({ tenant }: { tenant: PlatformTenantDetail }) {
  const [save, saveState] = useSetPlatformProductModulesMutation();
  const initial = useMemo(
    () => ({
      ecommerce: moduleOn(tenant, "ecommerce"),
      ecommercePayments: moduleOn(tenant, "ecommercePayments"),
      digitalMetals: moduleOn(tenant, "digitalMetals"),
    }),
    [tenant],
  );
  const [local, setLocal] = useState(initial);
  const seed = `${tenant.id}|${tenant.audit?.version ?? 0}`;
  const [applied, setApplied] = useState("");
  if (applied !== seed) {
    setApplied(seed);
    setLocal(initial);
  }

  const unchanged =
    local.ecommerce === initial.ecommerce
    && local.ecommercePayments === initial.ecommercePayments
    && local.digitalMetals === initial.digitalMetals;

  const apply = async (body: Record<string, boolean>) => {
    try {
      await save({ tenantId: tenant.id, body }).unwrap();
      toast.success("Product modules updated");
    } catch (e) {
      toastApiError(e, "Could not update product modules");
    }
  };

  const onToggle = async (key: ModuleKey, next: boolean) => {
    setLocal((p) => ({ ...p, [key]: next }));
    await apply({ [key]: next });
  };

  const anyActive = local.ecommerce || local.ecommercePayments || local.digitalMetals;

  return (
    <Surface
      title="Customer product modules"
      description="Platform entitlements and tenant switches for shop, booking, scheme checkout, and digital metals."
      action={<StatusBadge status={anyActive ? "ACTIVE" : "INACTIVE"} />}
    >
      <div className="space-y-4 p-5">
        <motionHint />
        {ROWS.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{row.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.hint}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {local[row.key] ? "On" : "Off"}
              </span>
              <Switch
                checked={local[row.key]}
                disabled={saveState.isLoading}
                onCheckedChange={(v) => void onToggle(row.key, v)}
              />
            </div>
          </label>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={saveState.isLoading || (local.ecommerce && local.ecommercePayments && local.digitalMetals)}
          onClick={() => {
            setLocal({ ecommerce: true, ecommercePayments: true, digitalMetals: true });
            void apply({ enableAll: true });
          }}
        >
          Enable all product modules
        </Button>
      </div>
    </Surface>
  );
}

function motionHint() {
  return (
    <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      PhonePe credentials (above), platform{" "}
      <code className="text-xs">ECOMMERCE_PAYMENTS_ROLLOUT_ENABLED</code>, and jeweller tax setup
      may still be required before live checkout.
    </p>
  );
}