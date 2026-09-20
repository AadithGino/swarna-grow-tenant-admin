"use client";

import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  CustomerKycVerificationForm,
  KycStatusHero,
  KycStepper,
} from "@/src/components/customer/customer-kyc-verification-form";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { useGetCustomerProfileQuery, useSubmitCustomerKycMutation } from "@/src/store/api/customer-api";
import { ProfileSubpageHeader } from "@/src/features/customer/customer-profile-shared";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function CustomerProfileKycPage() {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const kycEnabled = useCustomerKycEnabled();
  const { data, isLoading, isError, refetch } = useGetCustomerProfileQuery();
  const [submitKyc, kycState] = useSubmitCustomerKycMutation();

  useEffect(() => {
    if (!kycEnabled) {
      router.replace(customerPath(tenantSlug, "profile"));
    }
  }, [kycEnabled, router, tenantSlug]);

  if (!kycEnabled) return null;

  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const kyc = data.kyc;
  const canSubmit = Boolean(kyc?.canUpdate && kyc.status !== "VERIFIED");
  const activeStep: 1 | 2 | 3 =
    kyc?.status === "VERIFIED"
      ? 3
      : kyc?.status === "SUBMITTED" || kyc?.status === "PENDING"
        ? 3
        : 2;

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 1.25rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <ProfileSubpageHeader tenantSlug={tenantSlug} title="KYC verification" />
      <div className="mt-1">
        <KycStepper activeStep={activeStep} />
      </div>
      <div className="mt-5">
        <KycStatusHero status={kyc?.status} statusLabel={kyc?.statusLabel} />
      </div>
      {kyc?.status === "REJECTED" && kyc.rejectionReason ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {kyc.rejectionReason}
        </p>
      ) : null}
      {canSubmit ? (
        <div className="mt-4">
          <CustomerKycVerificationForm
            submitting={kycState.isLoading}
            disabled={!canSubmit}
            onSubmit={async (payload) => {
              try {
                await submitKyc(payload).unwrap();
                toast.success("Documents submitted for verification");
                router.replace(customerPath(tenantSlug, "profile"));
              } catch {
                toast.error("Could not submit documents");
              }
            }}
          />
        </div>
      ) : (
        <p className="customer-surface mt-5 p-4 text-sm leading-relaxed text-[#706b77]">
          {kyc?.status === "VERIFIED"
            ? "Your KYC is verified. Visit your branch if you need to update identity documents."
            : "Your documents are on file. We will notify you when verification completes."}
        </p>
      )}
    </div>
  );
}
