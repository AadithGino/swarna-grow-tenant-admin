"use client";

import { useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Headphones,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Coins,
  Package,
  Shield,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerDigitalMetalsOrdersHubHref } from "@/src/lib/customer-digital-metals-order-links";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";
import {
  useGetCustomerDevicesQuery,
  useGetCustomerProfileQuery,
  useRevokeCustomerDeviceMutation,
} from "@/src/store/api/customer-api";
import {
  formatPassbookLabel,
  formatProfileCustomerId,
  kycMenuBadge,
  maskCustomerMobile,
  ProfileAccountRow,
  ProfileMenuAction,
  ProfileMenuRow,
} from "@/src/features/customer/customer-profile-shared";
import { formatCustomerAddressDisplay } from "@/src/lib/customer-address-display";
import { useCustomerSignOut } from "@/src/lib/use-customer-sign-out";
import Link from "next/link";
import { toast } from "sonner";

export function CustomerProfilePage() {
  const { tenantSlug } = useCustomerTenant();
  const kycEnabled = useCustomerKycEnabled();
  const { visible: digitalMetalsVisible } = useCustomerDigitalMetalsVisible();
  const { data, isLoading, isError, refetch } = useGetCustomerProfileQuery();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { signOut, isSigningOut } = useCustomerSignOut();

  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const initials = data.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const showKycMenu = kycEnabled || Boolean(data.tenant.selfKycEnabled || data.tenant.redemptionKycRequired || data.kyc);
  const kyc = data.kyc;
  const customerId = formatProfileCustomerId(data.passbookNumber, data.customerNumber);
  const branchDisplay = (() => {
    const branch = data.branch;
    if (!branch) return "—";
    if (branch.address) {
      const parts = branch.address.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
      return branch.address;
    }
    return branch.name;
  })();

  return (
    <div className="mx-auto max-w-lg pb-6">
      <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">Profile</h1>

      <section className="customer-surface mt-4 flex items-center gap-4 p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#f6edf0] text-lg font-black text-[var(--customer-primary,#730321)]">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-[#171722]">{data.name}</p>
          <p className="text-xs font-semibold text-[#777280]">Customer {customerId}</p>
        </div>
      </section>

      <section className="customer-surface mt-4 overflow-hidden py-1">
        <ProfileAccountRow
          icon={UserRound}
          label="Name"
          value={data.name}
          href={customerPath(tenantSlug, "profile", "edit")}
        />
        <ProfileAccountRow
          icon={Mail}
          label="Email"
          value={data.email?.trim() ? data.email : "Add email"}
          href={customerPath(tenantSlug, "profile", "edit")}
        />
        <ProfileAccountRow
          icon={MapPin}
          label="Address"
          value={formatCustomerAddressDisplay(data.address) || "Add address"}
          href={customerPath(tenantSlug, "profile", "edit")}
        />
        <ProfileAccountRow icon={Smartphone} label="Mobile" value={maskCustomerMobile(data.mobile)} locked />
        <ProfileAccountRow
          icon={ClipboardList}
          label="Passbook"
          value={formatPassbookLabel(data.passbookNumber, data.customerNumber)}
        />
        <ProfileAccountRow icon={MapPin} label="Primary branch" value={branchDisplay} />
      </section>

      <section className="customer-surface mt-4 overflow-hidden py-1">
        {showKycMenu ? (
          <ProfileMenuRow
            icon={Shield}
            label="KYC & documents"
            href={customerPath(tenantSlug, "profile", "kyc")}
            badge={kycMenuBadge(kyc?.status, kyc?.statusLabel)}
          />
        ) : null}
        <ProfileMenuRow
          icon={UserRound}
          label="Nominee"
          href={customerPath(tenantSlug, "profile", "nominee")}
        />
        <ProfileMenuRow
          icon={MapPin}
          label="Saved addresses"
          href={customerPath(tenantSlug, "profile", "addresses")}
        />
        {digitalMetalsVisible ? (
          <>
            <ProfileMenuRow
              icon={Coins}
              label="Digital gold — wallet"
              href={customerPath(tenantSlug, "digital-metals")}
            />
            <ProfileMenuRow
              icon={ClipboardList}
              label="Digital gold orders"
              href={customerDigitalMetalsOrdersHubHref(tenantSlug)}
            />
          </>
        ) : null}
        <ProfileMenuRow
          icon={Package}
          label="Shop orders & delivery"
          href={customerShopOrdersPath(tenantSlug)}
        />
        <ProfileMenuRow
          icon={FileText}
          label="Passbook & all payments"
          href={customerPath(tenantSlug, "payments", "activity")}
        />
        <ProfileMenuRow
          icon={Smartphone}
          label="Security & devices"
          href={customerPath(tenantSlug, "security")}
        />
        <ProfileMenuRow icon={Headphones} label="Support" href={customerPath(tenantSlug, "support")} />
      </section>

      <section className="customer-surface mt-4 overflow-hidden py-1">
        <ProfileMenuAction
          icon={LogOut}
          label="Log out"
          hint="Sign out on this device"
          tone="leave"
          disabled={isSigningOut}
          onClick={() => setLogoutOpen(true)}
        />
      </section>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need your mobile number and OTP to sign in again. Push alerts on this device will stop until you
              log back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={isSigningOut} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSigningOut}
              className="rounded-xl border-0 font-bold text-white hover:opacity-95"
              style={{ background: "var(--customer-primary, #730321)" }}
              onClick={(event) => {
                event.preventDefault();
                void signOut();
              }}
            >
              {isSigningOut ? <LoaderCircle className="size-4 animate-spin" /> : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export function CustomerSecurityPage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerDevicesQuery();
  const [revoke] = useRevokeCustomerDeviceMutation();
  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;
  return (
    <div className="mx-auto max-w-lg pb-6">
      <Link
        href={customerPath(tenantSlug, "profile")}
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--customer-primary,#730321)]"
      >
        Profile
        <ChevronRight className="size-4" />
      </Link>
      <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">Security & devices</h1>
      <p className="mt-1 text-sm text-[#777280]">Devices signed in to your customer account.</p>
      <section className="customer-surface mt-5 p-4">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <ShieldCheck className="size-5 shrink-0" />
          <p>
            <b>Your account is protected with OTP sign-in.</b>
            <br />
            <span className="text-xs text-emerald-800/75">Revoking a device removes its push token and session.</span>
          </p>
        </div>
        <div className="mt-4 divide-y divide-[#ece6e1]">
          {data.map((device) => (
            <div key={device.deviceId} className="flex items-center gap-3 py-4">
              <span
                className="grid size-11 place-items-center rounded-2xl text-[var(--customer-primary,#730321)]"
                style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" }}
              >
                <Smartphone className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black">{device.deviceModel}</p>
                  {device.current ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      THIS DEVICE
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[#777280]">
                  {device.platform} · {device.lastUsedAt}
                </p>
              </div>
              {!device.current ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => revoke(device.deviceId).unwrap().then(() => toast.success("Device access revoked"))}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
