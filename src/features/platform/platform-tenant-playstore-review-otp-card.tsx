"use client";

import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { useSetPlayStoreReviewOtpMutation } from "@/src/store/api/platform-api";
import type { PlatformTenantDetail } from "@/src/types/platform";

export function PlatformTenantPlayStoreReviewOtpCard({ tenant }: { tenant: PlatformTenantDetail }) {
  const enabled = tenant.settings?.playStoreReviewOtpEnabled === true;
  const allowAfterGoLive = tenant.reviewOtpPolicy?.allowAfterGoLive === true;
  const goLiveBlocked = Boolean(tenant.goLiveAt) && !allowAfterGoLive;
  const [save, saveState] = useSetPlayStoreReviewOtpMutation();

  const onToggle = async (next: boolean) => {
    if (next && goLiveBlocked) {
      toast.error(
        "Cannot enable after go-live. On staging, set backend PLAYSTORE_REVIEW_OTP_ALLOW_AFTER_GO_LIVE=true and restart the API.",
      );
      return;
    }
    try {
      await save({ tenantId: tenant.id, enabled: next }).unwrap();
      toast.success(next ? "Play Store review OTP enabled (123456)" : "Play Store review OTP disabled");
    } catch (e) {
      toastApiError(e, "Could not update Play Store review OTP");
    }
  };

  return (
    <Surface
      title="Play Store app review OTP"
      description="Lets Google Play / internal testers sign in with fixed OTP 123456 on existing customer login APIs. Disabled automatically on go-live."
      action={<StatusBadge status={enabled ? "ACTIVE" : "INACTIVE"} />}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
            <Smartphone className="size-5 text-muted-foreground" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">Fixed test OTP: 123456</p>
            <p className="mt-1 text-muted-foreground">
              No app changes — same <code className="text-xs">/public/auth/otp/request</code> and{" "}
              <code className="text-xs">verify</code> endpoints. Real SMS may still be sent on request.
            </p>
            {goLiveBlocked && (
              <p className="mt-2 text-amber-800">
                This jeweller has go-live set. Review OTP is blocked unless the API has{" "}
                <code className="text-xs">PLAYSTORE_REVIEW_OTP_ALLOW_AFTER_GO_LIVE=true</code> (staging
                only — not allowed in production boot).
              </p>
            )}
            {!goLiveBlocked && tenant.goLiveAt && allowAfterGoLive && (
              <p className="mt-2 text-amber-800">
                Go-live is set; fixed OTP is allowed because staging policy is on. Use only for Play Store
                review builds.
              </p>
            )}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3">
          <span className="text-sm font-medium">Enable for testers</span>
          <Switch
            checked={enabled}
            disabled={saveState.isLoading || (goLiveBlocked && !enabled)}
            onCheckedChange={(v) => void onToggle(v)}
          />
        </label>
      </div>
    </Surface>
  );
}